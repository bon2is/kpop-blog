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
    melon?: number;
    genie?: number;
    bugs?: number;
  };
}

export interface ChartsData {
  updatedAt: string;
  unified: UnifiedSong[];
  melon: ChartSong[];
  genie: ChartSong[];
  bugs: ChartSong[];
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

/** Normalize key for cross-chart matching: lowercase, strip non-alphanumeric/Korean */
function normalizeKey(title: string, artist: string): string {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\(prod\..*?\)/gi, '')
      .replace(/[^a-z0-9가-힣]/g, '');
  return `${normalize(artist)}_${normalize(title)}`;
}

// ── Chart weights (Melon = primary Korean chart, Genie = secondary, Bugs = tertiary) ──
const WEIGHTS: Record<string, number> = {
  melon: 1.3,
  genie: 1.0,
  bugs: 0.8,
};

/** Points formula: rank 1 → 50 pts, rank 50 → 1 pt */
function rankPoints(rank: number, total: number): number {
  return Math.max(0, total + 1 - rank);
}

// ── Build unified chart ───────────────────────────────────────────────────────
function buildUnifiedChart(
  melon: ChartSong[],
  genie: ChartSong[],
  bugs: ChartSong[]
): UnifiedSong[] {
  const map = new Map<
    string,
    {
      title: string;
      artist: string;
      thumbnail?: string;
      youtubeUrl: string;
      score: number;
      chartRanks: { melon?: number; genie?: number; bugs?: number };
    }
  >();

  const addChart = (songs: ChartSong[], chartName: 'melon' | 'genie' | 'bugs') => {
    if (songs.length === 0) return;
    const weight = WEIGHTS[chartName];
    songs.forEach((song) => {
      const key = normalizeKey(song.title, song.artist);
      const pts = rankPoints(song.rank, songs.length) * weight;
      const existing = map.get(key);
      if (existing) {
        existing.score += pts;
        existing.chartRanks[chartName] = song.rank;
        // prefer melon thumbnail, then genie, then bugs
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

  addChart(melon, 'melon');
  addChart(genie, 'genie');
  addChart(bugs, 'bugs');

  return Array.from(map.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .map((song, i) => ({ rank: i + 1, ...song }));
}

// ── Melon Top 50 ─────────────────────────────────────────────────────────────
async function fetchMelonChart(): Promise<ChartSong[]> {
  try {
    console.log('Fetching Melon Top 50...');
    const res = await fetch('https://www.melon.com/chart/index.htm', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        Referer: 'https://www.melon.com/',
      },
      timeout: 20000,
    });

    if (!res.ok) { console.log(`  Melon returned ${res.status}`); return []; }

    const html: string = await res.text();
    const $ = cheerio.load(html);
    const songs: ChartSong[] = [];

    $('tr.lst50, tr.lst100').each((i, el) => {
      const rankText = $(el).find('.rank').first().text().trim();
      const rank = parseInt(rankText) || i + 1;
      const title = cleanTitle(
        $(el).find('.rank01 span a').attr('title')?.trim() ||
        $(el).find('.rank01 span a').text().trim() ||
        $(el).find('.rank01').text().trim()
      );
      const artist = cleanArtist(
        $(el).find('.rank02 a').first().text().trim() ||
        $(el).find('.rank02 .checkEllipsis').text().trim() ||
        $(el).find('.rank02').text().trim()
      );
      const thumbnail =
        $(el).find('img.image_typeAll').attr('src') ||
        $(el).find('img[src*="cdnimg"]').attr('src');

      if (title && artist && rank > 0 && songs.length < 50)
        songs.push({ rank, title, artist, thumbnail: thumbnail?.replace(/\?.*$/, ''), youtubeUrl: ytSearchUrl(artist, title) });
    });

    console.log(`  Got ${songs.length} songs from Melon`);
    return songs;
  } catch (err: unknown) {
    console.error('  Melon fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Genie Top 50 ─────────────────────────────────────────────────────────────
async function fetchGenieChart(): Promise<ChartSong[]> {
  try {
    console.log('Fetching Genie Top 50...');
    const res = await fetch('https://www.genie.co.kr/chart/top200', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        Referer: 'https://www.genie.co.kr/',
      },
      timeout: 20000,
    });

    if (!res.ok) { console.log(`  Genie returned ${res.status}`); return []; }

    const html: string = await res.text();
    const $ = cheerio.load(html);
    const songs: ChartSong[] = [];

    $('tr.list').each((i, el) => {
      const rank = i + 1;
      const title =
        $(el).find('.title').text().trim() ||
        $(el).find('.song-name').text().trim() ||
        $(el).find('a.title').text().trim();
      const artist =
        $(el).find('.artist').text().trim() ||
        $(el).find('.name').text().trim() ||
        $(el).find('a.artist').text().trim();
      const rawThumb =
        $(el).find('img').first().attr('src') ||
        $(el).find('img[src*="genie"]').attr('src');
      const thumbnail = rawThumb
        ? rawThumb.startsWith('http') ? rawThumb : `https://www.genie.co.kr${rawThumb}`
        : undefined;

      if (title && artist && songs.length < 50)
        songs.push({ rank, title, artist, thumbnail, youtubeUrl: ytSearchUrl(artist, title) });
    });

    console.log(`  Got ${songs.length} songs from Genie`);
    return songs;
  } catch (err: unknown) {
    console.error('  Genie fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Bugs Top 50 ──────────────────────────────────────────────────────────────
async function fetchBugsChart(): Promise<ChartSong[]> {
  try {
    console.log('Fetching Bugs Top 50...');
    const res = await fetch('https://music.bugs.co.kr/chart', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
      },
      timeout: 20000,
    });

    if (!res.ok) { console.log(`  Bugs returned ${res.status}`); return []; }

    const html: string = await res.text();
    const $ = cheerio.load(html);
    const songs: ChartSong[] = [];

    $('table.list tbody tr, tr.track_row').each((i, el) => {
      const rank = i + 1;
      const title =
        $(el).find('.title a').text().trim() ||
        $(el).find('.song_name').text().trim() ||
        $(el).find('p.title').text().trim();
      const artist =
        $(el).find('.artist a').first().text().trim() ||
        $(el).find('.artist').text().trim();
      const thumbnail =
        $(el).find('img.thumbnail').attr('src') ||
        $(el).find('img').first().attr('src');

      if (title && artist && songs.length < 50)
        songs.push({ rank, title, artist, thumbnail: thumbnail || undefined, youtubeUrl: ytSearchUrl(artist, title) });
    });

    console.log(`  Got ${songs.length} songs from Bugs`);
    return songs;
  } catch (err: unknown) {
    console.error('  Bugs fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\nFetching K-Pop charts...');

  const [melon, genie, bugs] = await Promise.all([
    fetchMelonChart(),
    fetchGenieChart(),
    fetchBugsChart(),
  ]);

  const unified = buildUnifiedChart(melon, genie, bugs);

  const data: ChartsData = {
    updatedAt: new Date().toISOString(),
    unified,
    melon,
    genie,
    bugs,
  };

  const outPath = path.join(process.cwd(), 'public/data/charts.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`\nDone! Saved to public/data/charts.json`);
  console.log(`  Melon:   ${melon.length} songs`);
  console.log(`  Genie:   ${genie.length} songs`);
  console.log(`  Bugs:    ${bugs.length} songs`);
  console.log(`  Unified: ${unified.length} songs`);
  console.log(`  Updated at: ${data.updatedAt}`);
}

main().catch(console.error);
