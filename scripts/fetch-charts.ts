import 'dotenv/config';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fetch = require('node-fetch');

interface ChartSong {
  rank: number;
  title: string;
  artist: string;
  thumbnail?: string;
  youtubeUrl: string;
}

interface ChartsData {
  updatedAt: string;
  melon: ChartSong[];
  genie: ChartSong[];
}

function ytSearchUrl(artist: string, title: string): string {
  // Use clean ASCII-friendly search terms
  const cleanArtist = artist.replace(/\s*\([^)]+\)/g, '').trim();  // strip "(한글명)"
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${cleanArtist} ${title} MV official`)}`;
}

function cleanTitle(text: string): string {
  return text
    .replace(/재생$/g, '')       // Melon appends "재생" (play button text)
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanArtist(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim();
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

    if (!res.ok) {
      console.log(`  Melon returned ${res.status}`);
      return [];
    }

    const html: string = await res.text();
    const $ = cheerio.load(html);
    const songs: ChartSong[] = [];

    $('tr.lst50, tr.lst100').each((i, el) => {
      // rank
      const rankText = $(el).find('.rank').first().text().trim();
      const rank = parseInt(rankText) || i + 1;

      // title: try multiple selectors
      const title =
        $(el).find('.rank01 span a').attr('title')?.trim() ||
        $(el).find('.rank01 span a').text().trim() ||
        $(el).find('.rank01').text().trim();

      // artist
      const artist =
        $(el).find('.rank02 a').first().text().trim() ||
        $(el).find('.rank02 .checkEllipsis').text().trim() ||
        $(el).find('.rank02').text().trim();

      // thumbnail
      const thumbnail =
        $(el).find('img.image_typeAll').attr('src') ||
        $(el).find('img[src*="melon"]').attr('src') ||
        $(el).find('img[src*="cdnimg"]').attr('src');

      const cleanT = cleanTitle(title);
      const cleanA = cleanArtist(artist);
      if (cleanT && cleanA && rank > 0 && songs.length < 50) {
        songs.push({
          rank,
          title: cleanT,
          artist: cleanA,
          thumbnail: thumbnail?.replace(/\?.*$/, '') || undefined,
          youtubeUrl: ytSearchUrl(cleanA, cleanT),
        });
      }
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

    if (!res.ok) {
      console.log(`  Genie returned ${res.status}`);
      return [];
    }

    const html: string = await res.text();
    const $ = cheerio.load(html);
    const songs: ChartSong[] = [];

    // Genie chart table rows
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

      const thumbnail =
        $(el).find('img').first().attr('src') ||
        $(el).find('img[src*="genie"]').attr('src');

      if (title && artist && songs.length < 50) {
        songs.push({
          rank,
          title,
          artist,
          thumbnail: thumbnail
            ? thumbnail.startsWith('http')
              ? thumbnail
              : `https://www.genie.co.kr${thumbnail}`
            : undefined,
          youtubeUrl: ytSearchUrl(artist, title),
        });
      }
    });

    console.log(`  Got ${songs.length} songs from Genie`);
    return songs;
  } catch (err: unknown) {
    console.error('  Genie fetch failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

// ── Bugs Top 50 (fallback if others empty) ───────────────────────────────────
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

    if (!res.ok) {
      console.log(`  Bugs returned ${res.status}`);
      return [];
    }

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

      if (title && artist && songs.length < 50) {
        songs.push({
          rank,
          title,
          artist,
          thumbnail: thumbnail || undefined,
          youtubeUrl: ytSearchUrl(artist, title),
        });
      }
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

  const data: ChartsData = {
    updatedAt: new Date().toISOString(),
    melon: melon.length > 0 ? melon : bugs,   // use Bugs as Melon fallback
    genie: genie.length > 0 ? genie : [],
  };

  const outPath = path.join(process.cwd(), 'public/data/charts.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`\nDone! Saved to public/data/charts.json`);
  console.log(`  Melon: ${data.melon.length} songs`);
  console.log(`  Genie: ${data.genie.length} songs`);
  console.log(`  Updated at: ${data.updatedAt}`);
}

main().catch(console.error);
