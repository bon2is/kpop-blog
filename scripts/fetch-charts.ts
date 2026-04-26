import 'dotenv/config';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fetch = require('node-fetch');

export interface ChartSong {
  rank: number;
  title: string;
  artist: string;
  thumbnail?: string;
  youtubeUrl: string;
}

export interface UnifiedSong {
  rank: number;
  title: string;
  artist: string;
  thumbnail?: string;
  youtubeUrl: string;
  score: number;
  chartRanks: {
    billboard?: number;
    spotify?: number;
    youtube?: number;
  };
}

export interface ChartsData {
  updatedAt: string;
  unified: UnifiedSong[];
  billboard: ChartSong[];
  spotify: ChartSong[];
  youtube: ChartSong[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ytSearchUrl(artist: string, title: string): string {
  const a = artist.replace(/\s*\([^)]+\)/g, '').trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${a} ${title} MV official`)}`;
}

function cleanTitle(text: string): string {
  return text.replace(/재생\s*$/, '').replace(/\s+/g, ' ').trim();
}

function cleanArtist(text: string): string {
  // Case 1: "Korean (English)" e.g. "화사 (HWASA)" → "HWASA"
  const koreanWithEnglish = text.match(/^[가-힣\s]+\(([A-Za-z0-9 .'-]+)\)$/);
  if (koreanWithEnglish) return koreanWithEnglish[1].trim();

  // Case 2: "English (Korean)" e.g. "IVE (아이브)" → "IVE"
  const englishWithKorean = text.replace(/\s*\(([^)]*[가-힣][^)]*)\)/g, '');
  return englishWithKorean.replace(/\s+/g, ' ').trim();
}

/** Normalize key for cross-chart matching: lowercase, strip non-alphanumeric */
function normalizeKey(title: string, artist: string): string {
  const normalizeStr = (s: string) =>
    s
      .replace(/\s*\([A-Z][A-Z\s]+\)/g, '')
      .toLowerCase()
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\(prod\..*?\)/gi, '')
      .replace(/[^a-z0-9]/g, '');

  const primaryArtist = artist.split(',')[0].trim();
  return `${normalizeStr(primaryArtist)}_${normalizeStr(title)}`;
}

// ── Chart weights (YouTube & Spotify weighted higher for global fan focus) ──
const WEIGHTS: Record<string, number> = {
  youtube:   1.2,
  spotify:   1.1,
  billboard: 1.0,
};

/** Points formula: rank 1 → 50 pts, rank 50 → 1 pt */
function rankPoints(rank: number, total: number): number {
  return Math.max(0, total + 1 - rank);
}

// ── Build unified chart ───────────────────────────────────────────────────────
function buildUnifiedChart(
  billboard: ChartSong[],
  spotify: ChartSong[],
  youtube: ChartSong[]
): UnifiedSong[] {
  const map = new Map<
    string,
    {
      title: string;
      artist: string;
      thumbnail?: string;
      youtubeUrl: string;
      score: number;
      chartRanks: { billboard?: number; spotify?: number; youtube?: number };
    }
  >();

  const addChart = (songs: ChartSong[], chartName: 'billboard' | 'spotify' | 'youtube') => {
    if (songs.length === 0) return;
    const weight = WEIGHTS[chartName];
    songs.forEach((song) => {
      const key = normalizeKey(song.title, song.artist);
      const pts = rankPoints(song.rank, songs.length) * weight;
      const existing = map.get(key);
      if (existing) {
        existing.score += pts;
        existing.chartRanks[chartName] = song.rank;
        if (!existing.thumbnail && song.thumbnail) existing.thumbnail = song.thumbnail;
      } else {
        map.set(key, {
          title: song.title,
          artist: song.artist,
          thumbnail: song.thumbnail,
          youtubeUrl: song.youtubeUrl,
          score: pts,
          chartRanks: { [chartName]: song.rank },
        });
      }
    });
  };

  addChart(billboard, 'billboard');
  addChart(spotify, 'spotify');
  addChart(youtube, 'youtube');

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((song, i) => ({ rank: i + 1, ...song }));
}

// ── Billboard K-Pop Hot 100 ───────────────────────────────────────────────────
async function fetchBillboardKpopChart(): Promise<ChartSong[]> {
  try {
    console.log('Fetching Billboard K-Pop Hot 100...');
    const res = await fetch('https://www.billboard.com/charts/k-pop-hot-100/', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 20000,
    });

    if (!res.ok) { console.log(`  Billboard returned ${res.status}`); return []; }

    const html: string = await res.text();
    const $ = cheerio.load(html);
    const songs: ChartSong[] = [];

    // Billboard renders chart entries as <li class="o-chart-results-list__item">
    // with nested title and artist spans.
    $('li.o-chart-results-list__item').each((i, el) => {
      if (songs.length >= 50) return;
      const titleEl = $(el).find('h3#title-of-a-story').first();
      const artistEl = titleEl.next('span');
      const title = cleanTitle(titleEl.text().trim());
      const artist = cleanArtist(artistEl.text().trim());
      if (!title || !artist) return;
      songs.push({ rank: songs.length + 1, title, artist, youtubeUrl: ytSearchUrl(artist, title) });
    });

    console.log(`  Got ${songs.length} songs from Billboard K-Pop`);
    return songs;
  } catch (err: unknown) {
    console.error('  Billboard fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Spotify Korea Weekly (via kworb.net) ──────────────────────────────────────
async function fetchSpotifyChart(): Promise<ChartSong[]> {
  try {
    console.log('Fetching Spotify Korea Weekly (kworb.net)...');
    const res = await fetch('https://kworb.net/spotify/country/kr_weekly.html', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 20000,
    });

    if (!res.ok) { console.log(`  Spotify (kworb) returned ${res.status}`); return []; }

    const html: string = await res.text();
    const $ = cheerio.load(html);
    const songs: ChartSong[] = [];

    $('table tbody tr').each((i, el) => {
      if (songs.length >= 50) return;
      const tds = $(el).find('td');
      if (tds.length < 3) return;

      const rank = parseInt(tds.eq(0).text().trim()) || (i + 1);
      // td[2] = <a>Artist</a> - <a>Title</a>
      const anchors = tds.eq(2).find('a');
      const artist = cleanArtist(anchors.eq(0).text().trim());
      const title = cleanTitle(anchors.eq(1).text().trim());

      if (artist && title)
        songs.push({ rank, title, artist, youtubeUrl: ytSearchUrl(artist, title) });
    });

    console.log(`  Got ${songs.length} songs from Spotify (kworb)`);
    return songs;
  } catch (err: unknown) {
    console.error('  Spotify fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ── YouTube Korea (via kworb.net insights) ────────────────────────────────────
async function fetchYoutubeChart(): Promise<ChartSong[]> {
  try {
    console.log('Fetching YouTube Korea (kworb.net insights)...');
    const res = await fetch('https://kworb.net/youtube/insights/kr.html', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 20000,
    });

    if (!res.ok) { console.log(`  YouTube (kworb) returned ${res.status}`); return []; }

    const html: string = await res.text();
    const $ = cheerio.load(html);
    const songs: ChartSong[] = [];

    $('table tbody tr').each((i, el) => {
      if (songs.length >= 50) return;
      const tds = $(el).find('td');
      if (tds.length < 3) return;

      const rank = parseInt(tds.eq(0).text().trim()) || (i + 1);
      // td[2] = plain text "Artist - Title"
      const artistTitle = tds.eq(2).text().trim();
      const dashIdx = artistTitle.indexOf(' - ');
      if (dashIdx === -1) return;

      const artist = cleanArtist(artistTitle.substring(0, dashIdx).trim());
      const title = cleanTitle(artistTitle.substring(dashIdx + 3).trim());

      if (artist && title)
        songs.push({ rank, title, artist, youtubeUrl: ytSearchUrl(artist, title) });
    });

    console.log(`  Got ${songs.length} songs from YouTube (kworb)`);
    return songs;
  } catch (err: unknown) {
    console.error('  YouTube fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\nFetching K-Pop charts (Billboard · Spotify · YouTube)...');

  const [billboard, spotify, youtube] = await Promise.all([
    fetchBillboardKpopChart(),
    fetchSpotifyChart(),
    fetchYoutubeChart(),
  ]);

  const unified = buildUnifiedChart(billboard, spotify, youtube);

  const data: ChartsData = {
    updatedAt: new Date().toISOString(),
    unified,
    billboard,
    spotify,
    youtube,
  };

  const outPath = path.join(process.cwd(), 'public/data/charts.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`\nDone! Saved to public/data/charts.json`);
  console.log(`  Billboard: ${billboard.length} songs`);
  console.log(`  Spotify:   ${spotify.length} songs`);
  console.log(`  YouTube:   ${youtube.length} songs`);
  console.log(`  Unified:   ${unified.length} songs`);
  console.log(`  Updated at: ${data.updatedAt}`);
}

main().catch(console.error);
