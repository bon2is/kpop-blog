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

// Weekly music show broadcasts (KST)
// day: 0=Sun, 1=Mon, ..., 6=Sat
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
        links: show.links,
      });
    }
  }

  return events;
}

async function fetchKpopScheduleEvents(): Promise<ScheduleEvent[]> {
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

    while ((match = itemRegex.exec(text)) !== null && idx < 20) {
      const item = match[1];
      const title = extractXmlTag(item, 'title');
      const pubDate = extractXmlTag(item, 'pubDate');
      const link = extractXmlTag(item, 'link');

      if (!title || !pubDate) continue;

      const parsed = new Date(pubDate);
      if (isNaN(parsed.getTime())) continue;

      const dateStr = toKSTDateString(parsed);
      const eventType = classifyTitle(title);
      const artist = extractArtistFromTitle(title);

      events.push({
        id: `scraped-${idx}-${dateStr}`,
        date: dateStr,
        type: eventType,
        artist: artist || 'K-Pop',
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim(),
        links: link ? { official: link } : undefined,
      });

      idx++;
    }
  } catch {
    // Network error or parse failure — return empty array
  }

  return events;
}

function extractXmlTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([^<]*)</${tag}>`));
  return m ? (m[1] || m[2] || '').trim() : '';
}

function classifyTitle(title: string): EventType {
  const t = title.toLowerCase();
  if (t.includes('concert') || t.includes('tour') || t.includes('show')) return 'concert';
  if (t.includes('comeback') || t.includes('debut') || t.includes('return')) return 'comeback';
  if (t.includes('fanmeeting') || t.includes('fan meeting') || t.includes('fan sign')) return 'fanmeeting';
  if (t.includes('award') || t.includes('ceremony') || t.includes('daesang')) return 'award';
  if (t.includes('album') || t.includes('single') || t.includes('ep') || t.includes('release')) return 'release';
  if (t.includes('youtube') || t.includes('vlive') || t.includes('live stream')) return 'youtube';
  return 'other';
}

const KNOWN_ARTISTS = [
  'BTS', 'BLACKPINK', 'aespa', 'IVE', 'Stray Kids', 'TWICE', 'NewJeans', 'SEVENTEEN',
  'EXO', 'NCT', 'ATEEZ', 'TXT', 'ITZY', 'MAMAMOO', 'Red Velvet', 'Girls Generation',
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

function loadExistingFutureEvents(): ScheduleEvent[] {
  if (!fs.existsSync(SCHEDULE_PATH)) return [];

  try {
    const raw = fs.readFileSync(SCHEDULE_PATH, 'utf-8');
    const data: ScheduleData = JSON.parse(raw);
    const today = toKSTDateString(new Date());
    return data.events.filter(
      (e) => e.date >= today && !e.id.startsWith('broadcast-')
    );
  } catch {
    return [];
  }
}

function deduplicateEvents(events: ScheduleEvent[]): ScheduleEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

async function main(): Promise<void> {
  process.stdout.write('Fetching K-Pop schedule...\n');

  const DAYS_AHEAD = 14;

  const broadcasts = generateRecurringBroadcasts(DAYS_AHEAD);
  process.stdout.write(`Generated ${broadcasts.length} recurring broadcast events\n`);

  const existingEvents = loadExistingFutureEvents();
  process.stdout.write(`Preserved ${existingEvents.length} existing future events\n`);

  const scrapedEvents = await fetchKpopScheduleEvents();
  if (scrapedEvents.length > 0) {
    process.stdout.write(`Scraped ${scrapedEvents.length} additional events\n`);
  }

  const cutoff = toKSTDateString(new Date());
  const all = deduplicateEvents([...existingEvents, ...broadcasts, ...scrapedEvents])
    .filter((e) => e.date >= cutoff)
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
