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
    circle?: number;
    spotify?: number;
    youtube?: number;
  };
}

export interface ChartsData {
  updatedAt: string;
  unified: UnifiedSong[];
  circle: ChartSong[];
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

// ── Artist alias map (Korean name → canonical English, for cross-chart matching) ──
// Global charts (Spotify/YouTube via kworb) use English romanizations while
// Circle Chart returns Korean names for domestic indie/solo artists.
const ARTIST_ALIASES: Record<string, string> = {
  '한로로':  'hanroro',
  '카더가든': 'carthegarden',
  '이찬혁':  'leechanhyuk',
  '다비치':  'davichi',
  '임영웅':  'limyoungwoong',
  '아이유':  'iu',
  '박재범':  'jaypark',
  '헤이즈':  'heize',
  '적재':    'jukjae',
  '이무진':  'leemujin',
  '폴킴':    'paulkim',
  '멜로망스': 'melodymance',
  // English variant → canonical (handles spacing/punctuation differences)
  'car the garden': 'carthegarden',
  'lee chanhyuk':   'leechanhyuk',
};

/** Normalize key for cross-chart matching: lowercase, strip non-alphanumeric/Korean */
function normalizeKey(title: string, artist: string): string {
  const normalizeStr = (s: string) =>
    s
      // Strip ALL-CAPS English parentheticals BEFORE lowercasing
      // e.g. "뛰어(JUMP)" → "뛰어", "뛰어 (JUMP VERSION)" → "뛰어"
      // Keeps "404 (New Era)" intact (mixed case, not all-caps)
      .replace(/\s*\([A-Z][A-Z\s]+\)/g, '')
      .toLowerCase()
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\(prod\..*?\)/gi, '')
      .replace(/[^a-z0-9가-힣]/g, '');

  const normalizedArtist = normalizeStr(artist);
  const canonicalArtist = ARTIST_ALIASES[normalizedArtist] ?? normalizedArtist;

  return `${canonicalArtist}_${normalizeStr(title)}`;
}

// ── Chart weights (YouTube & Spotify weighted higher for global fan focus) ──
const WEIGHTS: Record<string, number> = {
  youtube: 1.2,
  spotify: 1.1,
  circle:  1.0,
};

/** Points formula: rank 1 → 50 pts, rank 50 → 1 pt */
function rankPoints(rank: number, total: number): number {
  return Math.max(0, total + 1 - rank);
}

// ── Build unified chart ───────────────────────────────────────────────────────
function buildUnifiedChart(
  circle: ChartSong[],
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
      chartRanks: { circle?: number; spotify?: number; youtube?: number };
    }
  >();

  const addChart = (songs: ChartSong[], chartName: 'circle' | 'spotify' | 'youtube') => {
    if (songs.length === 0) return;
    const weight = WEIGHTS[chartName];
    songs.forEach((song) => {
      const key = normalizeKey(song.title, song.artist);
      const pts = rankPoints(song.rank, songs.length) * weight;
      const existing = map.get(key);
      if (existing) {
        existing.score += pts;
        existing.chartRanks[chartName] = song.rank;
        // prefer circle thumbnail (has album art), then others
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

  addChart(circle, 'circle');
  addChart(spotify, 'spotify');
  addChart(youtube, 'youtube');

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((song, i) => ({ rank: i + 1, ...song }));
}

// ── Circle Chart (circlechart.kr) ─────────────────────────────────────────────
async function fetchCircleChart(): Promise<ChartSong[]> {
  try {
    console.log('Fetching Circle Chart...');

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    // targetTime = week of year (1-based)
    const startOfYear = new Date(year, 0, 1);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000) + 1;
    const weekOfYear = Math.ceil(dayOfYear / 7);

    // Circle Chart publishes weekly data with a 1-week delay.
    // Try current week first, fall back up to 2 weeks if not yet published.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any = null;
    for (let offset = 0; offset <= 2; offset++) {
      const targetTime = weekOfYear - offset;
      if (targetTime < 1) break;
      const params = new URLSearchParams({
        nationGbn: 'T',
        serviceGbn: 'ALL',
        termGbn: 'week',
        hitYear: String(year),
        targetTime: String(targetTime),
        yearTime: String(month),
        PageSize: '50',
        curUrl: 'circlechart.kr',
      });
      const res = await fetch('https://circlechart.kr/data/api/chart/onoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://circlechart.kr/',
          Origin: 'https://circlechart.kr',
        },
        body: params.toString(),
        timeout: 20000,
      });
      if (!res.ok) { console.log(`  Circle Chart returned ${res.status}`); continue; }
      const candidate = await res.json() as { ResultStatus: string; List?: Record<string, unknown> };
      if (candidate.ResultStatus === 'OK' && candidate.List && Object.keys(candidate.List).length > 0) {
        json = candidate;
        console.log(`  Circle Chart: using week ${targetTime}`);
        break;
      }
    }

    if (!json) {
      console.log('  Circle Chart: no data found for recent weeks');
      return [];
    }

    const songs: ChartSong[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(json.List as Record<string, any>).forEach((item: any) => {
      const rank = parseInt(item.SERVICE_RANKING);
      if (!rank || rank > 50) return;
      const title = cleanTitle(String(item.SONG_NAME || ''));
      const artist = cleanArtist(String(item.ARTIST_NAME || ''));
      const rawImg = String(item.ALBUMIMG || '');
      const thumbnail = rawImg
        ? (rawImg.startsWith('http') ? rawImg : `https://circlechart.kr${rawImg}`)
        : undefined;

      if (title && artist)
        songs.push({ rank, title, artist, thumbnail, youtubeUrl: ytSearchUrl(artist, title) });
    });

    songs.sort((a, b) => a.rank - b.rank);
    console.log(`  Got ${songs.length} songs from Circle Chart`);
    return songs;
  } catch (err: unknown) {
    console.error('  Circle Chart fetch failed:', err instanceof Error ? err.message : err);
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
  console.log('\nFetching K-Pop charts (Circle · Spotify · YouTube)...');

  const [circle, spotify, youtube] = await Promise.all([
    fetchCircleChart(),
    fetchSpotifyChart(),
    fetchYoutubeChart(),
  ]);

  const unified = buildUnifiedChart(circle, spotify, youtube);

  const data: ChartsData = {
    updatedAt: new Date().toISOString(),
    unified,
    circle,
    spotify,
    youtube,
  };

  const outPath = path.join(process.cwd(), 'public/data/charts.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`\nDone! Saved to public/data/charts.json`);
  console.log(`  Circle:   ${circle.length} songs`);
  console.log(`  Spotify:  ${spotify.length} songs`);
  console.log(`  YouTube:  ${youtube.length} songs`);
  console.log(`  Unified:  ${unified.length} songs`);
  console.log(`  Updated at: ${data.updatedAt}`);
}

main().catch(console.error);
