/**
 * backfill-images.ts
 *
 * 기존 기사 중 isAIGenerated: true 인 것들을 대상으로
 * 원본 기사(sourceUrl)의 og:image를 가져와 실제 사진으로 교체합니다.
 *
 * 실행: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/backfill-images.ts
 *
 * 옵션:
 *   --dry-run    실제로 파일을 변경하지 않고 결과만 출력
 *   --limit N    최대 N개 기사만 처리 (기본값: 전체)
 *   --category X 특정 카테고리만 처리 (예: drama, music)
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import sharp from 'sharp';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fetch = require('node-fetch');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cheerio = require('cheerio');

const CONTENT_DIR = path.join(process.cwd(), 'content/posts');
const IMAGES_DIR = path.join(process.cwd(), 'public/images/posts');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const LIMIT = (() => {
  const i = args.indexOf('--limit');
  return i !== -1 ? parseInt(args[i + 1], 10) : Infinity;
})();
const FILTER_CATEGORY = (() => {
  const i = args.indexOf('--category');
  return i !== -1 ? args[i + 1] : null;
})();

// ── Fetch og:image from original article ─────────────────────────────────────

async function fetchOgImage(articleUrl: string): Promise<string | undefined> {
  try {
    const response = await fetch(articleUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KpopDailyBot/1.0)' },
      timeout: 12000,
    });
    if (!response.ok) return undefined;

    const html = await response.text();
    const $ = cheerio.load(html);
    const ogImage =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content');

    if (ogImage && ogImage.startsWith('http')) return ogImage;
  } catch {
    // Network error — skip silently
  }
  return undefined;
}

// ── Search Wikipedia for drama poster ────────────────────────────────────────

async function fetchWikipediaImage(title: string): Promise<string | undefined> {
  try {
    const searchTitle = title
      .replace(/\b(episode|ep\.?|season|s\d+|e\d+)\s*\d+.*$/i, '')
      .replace(/[-–|:].{0,40}$/, '')
      .trim()
      .slice(0, 60);

    const wikiHeaders = {
      'User-Agent': 'KpopDailyBot/1.0 (https://kpop.andxo.com)',
      'Accept': 'application/json',
    };

    // Step 1: direct page lookup
    const directRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTitle)}`,
      { headers: wikiHeaders, timeout: 10000 }
    );
    if (directRes.ok) {
      const d = await directRes.json() as { originalimage?: { source?: string }; thumbnail?: { source?: string } };
      const img = d.originalimage?.source || d.thumbnail?.source;
      if (img) return img;
    }

    // Step 2: search fallback
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTitle + ' TV series drama')}&srlimit=3&format=json&origin=*`,
      { headers: wikiHeaders, timeout: 10000 }
    );
    if (!searchRes.ok) return undefined;

    const searchData = await searchRes.json() as { query?: { search?: Array<{ title: string }> } };
    const firstResult = searchData.query?.search?.[0];
    if (!firstResult) return undefined;

    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstResult.title)}`,
      { headers: wikiHeaders, timeout: 10000 }
    );
    if (!summaryRes.ok) return undefined;
    const s = await summaryRes.json() as { originalimage?: { source?: string }; thumbnail?: { source?: string } };
    return s.originalimage?.source || s.thumbnail?.source;
  } catch {
    return undefined;
  }
}

// ── Download and save image ───────────────────────────────────────────────────

async function downloadAndSave(imageUrl: string, slug: string): Promise<string | undefined> {
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KpopDailyBot/1.0)' },
      timeout: 15000,
    });
    if (!response.ok) return undefined;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) return undefined;

    const imageBuffer = await response.buffer();
    if (imageBuffer.length < 5000) return undefined;

    const outputPath = path.join(IMAGES_DIR, `${slug}.webp`);
    await sharp(imageBuffer)
      .resize(1200, 630, { fit: 'cover', position: 'center' })
      .webp({ quality: 88, effort: 5 })
      .toFile(outputPath);

    return `/images/posts/${slug}.webp`;
  } catch {
    return undefined;
  }
}

// ── Update article frontmatter ────────────────────────────────────────────────

function updateArticleFrontmatter(filePath: string, thumbnailPath: string): void {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = matter(raw);

  parsed.data.thumbnail = thumbnailPath;
  parsed.data.isAIGenerated = false;

  const updated = matter.stringify(parsed.content, parsed.data);
  fs.writeFileSync(filePath, updated, 'utf-8');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`=== Backfill Images ===`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  if (FILTER_CATEGORY) console.log(`Category filter: ${FILTER_CATEGORY}`);
  if (LIMIT !== Infinity) console.log(`Limit: ${LIMIT}`);
  console.log('');

  // Collect target articles
  const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  const targets: Array<{ file: string; slug: string; data: Record<string, unknown> }> = [];

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const { data } = matter(fs.readFileSync(filePath, 'utf-8'));

    if (!data.isAIGenerated) continue;
    if (!data.sourceUrl) continue;
    if (FILTER_CATEGORY && data.category !== FILTER_CATEGORY) continue;

    const slug = file.replace('.md', '');
    targets.push({ file, slug, data });
  }

  console.log(`Found ${targets.length} AI-generated articles to process\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let count = 0;

  for (const { file, slug, data } of targets) {
    if (count >= LIMIT) break;
    count++;

    const category = data.category as string;
    const sourceUrl = data.sourceUrl as string;
    const title = data.title as string;

    console.log(`[${count}/${Math.min(targets.length, LIMIT)}] ${title.slice(0, 60)}`);
    console.log(`  Category: ${category} | Source: ${sourceUrl.slice(0, 60)}...`);

    let imageUrl: string | undefined;

    // 1) Drama: try Wikipedia first
    if (category === 'drama') {
      imageUrl = await fetchWikipediaImage(title);
      if (imageUrl) console.log(`  Source: Wikipedia`);
    }

    // 2) All: try og:image from original article
    if (!imageUrl) {
      imageUrl = await fetchOgImage(sourceUrl);
      if (imageUrl) console.log(`  Source: og:image`);
    }

    if (!imageUrl) {
      console.log(`  ✗ No image found — skipped`);
      skipped++;
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    console.log(`  Image URL: ${imageUrl.slice(0, 80)}...`);

    if (DRY_RUN) {
      console.log(`  → [DRY RUN] Would download and update article`);
      updated++;
      continue;
    }

    const savedPath = await downloadAndSave(imageUrl, slug);
    if (!savedPath) {
      console.log(`  ✗ Download failed`);
      failed++;
      await new Promise(r => setTimeout(r, 500));
      continue;
    }

    const filePath = path.join(CONTENT_DIR, file);
    updateArticleFrontmatter(filePath, savedPath);
    console.log(`  ✓ Updated → ${savedPath}`);
    updated++;

    // Rate limiting: be a good citizen
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated} | Skipped (no image): ${skipped} | Failed: ${failed}`);
  if (DRY_RUN) console.log('(Dry run — no files were changed)');
}

main().catch(console.error);
