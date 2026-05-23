import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fetch = require('node-fetch');

type EventType = 'comeback' | 'concert' | 'broadcast' | 'youtube' | 'fanmeeting' | 'award' | 'release' | 'other';

interface ScheduleEvent {
  id: string;
  date: string;
  time?: string;
  timezone?: string;
  type: EventType;
  artist: string;
  title: string;
  description?: string;
  source?: string;
  links?: {
    youtube?: string;
    ticket?: string;
    official?: string;
  };
}

interface ScheduleData {
  lastUpdated: string;
  events: ScheduleEvent[];
}

const SCHEDULE_PATH = path.join(process.cwd(), 'public', 'schedule.json');

// Weekly music show broadcasts (KST) — day: 0=Sun, 1=Mon, ..., 6=Sat
const RECURRING_BROADCASTS: Array<{
  day: number;
  time: string;
  title: string;
  artist: string;
  description: string;
  links: { youtube?: string; official?: string };
}> = [
  {
    day: 3, // Wednesday
    time: '18:00',
    title: 'Show Champion',
    artist: 'Various Artists',
    description: 'MBC M weekly music show',
    links: { youtube: 'https://www.youtube.com/@MBCkpop', official: 'https://www.imbc.com' },
  },
  {
    day: 4, // Thursday
    time: '18:00',
    title: 'M Countdown',
    artist: 'Various Artists',
    description: 'Mnet weekly music countdown show',
    links: { youtube: 'https://www.youtube.com/@MnetMcountdown', official: 'https://www.mnet.com' },
  },
  {
    day: 5, // Friday
    time: '17:10',
    title: 'Music Bank',
    artist: 'Various Artists',
    description: 'KBS Music Bank weekly performance show',
    links: { youtube: 'https://www.youtube.com/@KBSKpop', official: 'https://www.kbs.co.kr' },
  },
  {
    day: 6, // Saturday
    time: '17:15',
    title: 'Show! Music Core',
    artist: 'Various Artists',
    description: 'MBC Show! Music Core weekly performance show',
    links: { youtube: 'https://www.youtube.com/@mbckpop', official: 'https://www.imbc.com' },
  },
  {
    day: 0, // Sunday
    time: '15:40',
    title: 'Inkigayo',
    artist: 'Various Artists',
    description: 'SBS Inkigayo weekly music show',
    links: { youtube: 'https://www.youtube.com/@SBSenter', official: 'https://programs.sbs.co.kr' },
  },
];

function toKSTDateString(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
}

function generateRecurringBroadcasts(days: number): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];
  const now = new Date();

  for (let d = 0; d <= days; d++) {
    const target = new Date(now);
    target.setUTCDate(now.getUTCDate() + d);
    const dateStr = toKSTDateString(target);

    const kstMs = target.getTime() + 9 * 60 * 60 * 1000;
    const kstDay = new Date(kstMs).getUTCDay();

    for (const show of RECURRING_BROADCASTS) {
      if (show.day !== kstDay) continue;
      events.push({
        id: `broadcast-${show.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${dateStr}`,
        date: dateStr,
        time: show.time,
        timezone: 'KST',
        type: 'broadcast',
        artist: show.artist,
        title: show.title,
        description: show.description,
        source: 'recurring',
        links: show.links,
      });
    }
  }

  return events;
}

// Extract an actual event date from article text (not pubDate).
// pubDate is the article publication date, NOT the event date.
// Returns YYYY-MM-DD or null if no clear future date found.
function extractDateFromText(text: string, fallbackYear = new Date().getFullYear()): string | null {
  const MONTHS: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7,
    sep: 8, oct: 9, nov: 10, dec: 11,
  };

  // ISO-like: 2026-05-28 or 2026/05/28
  const isoMatch = text.match(/\b(202[0-9])[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12][0-9]|3[01])\b/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  // "May 28", "May 28th", "May 28, 2026"
  const longMatch = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:[,\s]+(202[0-9]))?\b/i
  );
  if (longMatch) {
    const month = MONTHS[longMatch[1].toLowerCase()];
    const day = parseInt(longMatch[2], 10);
    const year = longMatch[3] ? parseInt(longMatch[3], 10) : fallbackYear;
    if (month === undefined || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month, day));
    return d.toISOString().split('T')[0];
  }

  return null;
}

function extractXmlTag(xml: string, tag: string): string {
  const m = xml.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`)
  );
  return m ? (m[1] || m[2] || '').trim() : '';
}

function classifyTitle(title: string): EventType {
  const t = title.toLowerCase();
  if (t.includes('concert') || t.includes('tour') || t.includes('world tour')) return 'concert';
  if (t.includes('comeback') || t.includes('debut') || t.includes('return')) return 'comeback';
  if (t.includes('fanmeeting') || t.includes('fan meeting') || t.includes('fan sign')) return 'fanmeeting';
  if (t.includes('award') || t.includes('ceremony') || t.includes('daesang')) return 'award';
  if (t.includes('album') || t.includes('single') || t.includes(' ep ') || t.includes('release')) return 'release';
  if (t.includes('youtube') || t.includes('vlive') || t.includes('live stream')) return 'youtube';
  return 'other';
}

const KNOWN_ARTISTS = [
  'BTS', 'BLACKPINK', 'aespa', 'IVE', 'Stray Kids', 'TWICE', 'NewJeans', 'SEVENTEEN',
  'EXO', 'NCT', 'ATEEZ', 'TXT', 'ITZY', 'MAMAMOO', 'Red Velvet', "Girls' Generation",
  'SHINee', 'GOT7', 'Super Junior', 'BIGBANG', 'MONSTA X', 'DAY6', 'ENHYPEN',
  'NMIXX', 'LE SSERAFIM', 'fromis_9', 'THE BOYZ', 'CRAVITY', 'ASTRO', 'ONEUS',
  'Weeekly', 'VIVIZ', 'KISS OF LIFE', 'BABYMONSTER', 'ILLIT', 'TWS', 'RIIZE',
  'ZEROBASEONE', 'BOYNEXTDOOR', 'tripleS', 'UNIS', 'MEOVV', 'PLAVE',
];

function extractArtistFromTitle(title: string): string {
  for (const artist of KNOWN_ARTISTS) {
    if (title.toLowerCase().includes(artist.toLowerCase())) return artist;
  }
  const colonParts = title.split(':');
  if (colonParts.length > 1) return colonParts[0].trim();
  return '';
}

// Scrape kpopschedule.com RSS and parse event dates from article content body.
// Intentionally does NOT use pubDate — that is the article publication date, not the event date.
async function scrapeKpopScheduleRSS(todayStr: string, cutoffStr: string): Promise<ScheduleEvent[]> {
  const events: ScheduleEvent[] = [];

  try {
    const res = await fetch('https://kpopschedule.com/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KpopDailyBot/1.0)' },
      timeout: 8000,
    });

    if (!res.ok) return events;

    const text: string = await res.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let idx = 0;

    while ((match = itemRegex.exec(text)) !== null && idx < 30) {
      const item = match[1];
      const title = extractXmlTag(item, 'title');
      const link = extractXmlTag(item, 'link');
      const description = extractXmlTag(item, 'description');

      if (!title) { idx++; continue; }

      const artist = extractArtistFromTitle(title);
      if (!artist) { idx++; continue; }

      const eventDate = extractDateFromText(`${title} ${description}`);
      if (!eventDate || eventDate < todayStr || eventDate > cutoffStr) { idx++; continue; }

      events.push({
        id: `kpopschedule-${idx}-${eventDate}`,
        date: eventDate,
        type: classifyTitle(title),
        artist,
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
        source: 'kpopschedule',
        links: link ? { official: link } : undefined,
      });

      idx++;
    }
  } catch {
    // Network error or parse failure — return partial results
  }

  return events;
}

// Scrape Soompi RSS for articles explicitly announcing future comeback/release dates.
// Only keeps items where a date is stated in the article content (not inferred).
async function scrapeSoompiFeed(todayStr: string, cutoffStr: string): Promise<ScheduleEvent[]> {
  const events: ScheduleEvent[] = [];

  try {
    const res = await fetch('https://www.soompi.com/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KpopDailyBot/1.0)' },
      timeout: 8000,
    });

    if (!res.ok) return events;

    const text: string = await res.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let idx = 0;

    while ((match = itemRegex.exec(text)) !== null && idx < 40) {
      const item = match[1];
      const title = extractXmlTag(item, 'title');
      const link = extractXmlTag(item, 'link');
      const description = extractXmlTag(item, 'description');

      if (!title) { idx++; continue; }

      // Only process articles that explicitly announce a scheduled event date
      const isAnnouncement = /\b(release date|will release|drops on|set for|scheduled for|announces|new album|new single|concert date|tour date|comeback date)\b/i.test(title);
      if (!isAnnouncement) { idx++; continue; }

      const artist = extractArtistFromTitle(title);
      if (!artist) { idx++; continue; }

      const eventDate = extractDateFromText(`${title} ${description}`);
      if (!eventDate || eventDate < todayStr || eventDate > cutoffStr) { idx++; continue; }

      events.push({
        id: `soompi-${idx}-${eventDate}`,
        date: eventDate,
        type: classifyTitle(title),
        artist,
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
        source: 'soompi',
        links: link ? { official: link } : undefined,
      });

      idx++;
    }
  } catch {
    // Network error or parse failure
  }

  return events;
}

// Deduplicates by ID, then by artist+date+type for non-broadcast events.
// Broadcasts (recurring) are placed first so they win on type-based deduplication.
function deduplicateEvents(events: ScheduleEvent[]): ScheduleEvent[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();

  return events.filter((e) => {
    if (seenIds.has(e.id)) return false;
    seenIds.add(e.id);

    if (e.type !== 'broadcast') {
      const key = `${e.artist.toLowerCase()}|${e.date}|${e.type}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
    }

    return true;
  });
}

async function main(): Promise<void> {
  process.stdout.write('Fetching K-Pop schedule...\n');

  const DAYS_AHEAD = 14;
  const todayStr = toKSTDateString(new Date());
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() + DAYS_AHEAD);
  const cutoffStr = toKSTDateString(cutoffDate);

  const broadcasts = generateRecurringBroadcasts(DAYS_AHEAD);
  process.stdout.write(`Generated ${broadcasts.length} recurring broadcast events\n`);

  const [kpopScheduleEvents, soompiFeedEvents] = await Promise.all([
    scrapeKpopScheduleRSS(todayStr, cutoffStr),
    scrapeSoompiFeed(todayStr, cutoffStr),
  ]);

  process.stdout.write(`kpopschedule.com: ${kpopScheduleEvents.length} events\n`);
  process.stdout.write(`Soompi: ${soompiFeedEvents.length} events\n`);

  // broadcasts first so deduplication preserves them over scraped duplicates
  const all = deduplicateEvents([...broadcasts, ...kpopScheduleEvents, ...soompiFeedEvents])
    .filter((e) => e.date >= todayStr)
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });

  const output: ScheduleData = {
    lastUpdated: new Date().toISOString(),
    events: all,
  };

  fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(output, null, 2));
  process.stdout.write(`Schedule updated: ${all.length} events written to public/schedule.json\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`fetch-schedule failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
