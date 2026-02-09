/**
 * fix-tags.ts
 * Migration script to re-extract tags for all existing articles.
 * Fixes the IVE false-positive bug where text.includes('IVE') matched
 * words like "LIVE", "MASSIVE", "ARCHIVE", etc.
 *
 * Usage: npx ts-node --project tsconfig.scripts.json scripts/fix-tags.ts
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDirectory = path.join(process.cwd(), 'content/posts');

// Same word-boundary-based extractTags as in fetch-news.ts
function extractTags(title: string, content: string): string[] {
  const text = `${title} ${content}`;
  const tags: Set<string> = new Set();

  const groups: Array<{ name: string; pattern: RegExp }> = [
    { name: 'BTS', pattern: /\bBTS\b/ },
    { name: 'BLACKPINK', pattern: /\bBLACKPINK\b/i },
    { name: 'TWICE', pattern: /\bTWICE\b/ },
    { name: 'EXO', pattern: /\bEXO\b/ },
    { name: 'NCT', pattern: /\bNCT\b/ },
    { name: 'Red Velvet', pattern: /\bRed Velvet\b/i },
    { name: 'SEVENTEEN', pattern: /\bSEVENTEEN\b/i },
    { name: 'Stray Kids', pattern: /\bStray Kids\b/i },
    { name: 'ITZY', pattern: /\bITZY\b/i },
    { name: 'aespa', pattern: /\baespa\b/i },
    { name: 'NewJeans', pattern: /\bNewJeans\b/i },
    { name: 'LE SSERAFIM', pattern: /\bLE SSERAFIM\b/i },
    { name: 'IVE', pattern: /\bIVE\b(?!\w)/ },
    { name: 'NMIXX', pattern: /\bNMIXX\b/i },
    { name: 'TXT', pattern: /\bTXT\b/ },
    { name: 'ENHYPEN', pattern: /\bENHYPEN\b/i },
    { name: 'GOT7', pattern: /\bGOT7\b/i },
    { name: 'MONSTA X', pattern: /\bMONSTA X\b/i },
    { name: 'ATEEZ', pattern: /\bATEEZ\b/i },
    { name: 'THE BOYZ', pattern: /\bTHE BOYZ\b/i },
    { name: 'TREASURE', pattern: /\bTREASURE\b/ },
    { name: '(G)I-DLE', pattern: /\(G\)I-DLE/i },
    { name: 'Kep1er', pattern: /\bKep1er\b/i },
    { name: 'MAMAMOO', pattern: /\bMAMAMOO\b/i },
    { name: 'BIGBANG', pattern: /\bBIGBANG\b/i },
    { name: '2NE1', pattern: /\b2NE1\b/i },
    { name: 'Girls Generation', pattern: /\bGirls.? Generation\b/i },
    { name: 'SNSD', pattern: /\bSNSD\b/ },
    { name: 'Super Junior', pattern: /\bSuper Junior\b/i },
    { name: 'SHINee', pattern: /\bSHINee\b/i },
    { name: 'RIIZE', pattern: /\bRIIZE\b/i },
    { name: 'BABYMONSTER', pattern: /\bBABYMONSTER\b/i },
    { name: 'ILLIT', pattern: /\bILLIT\b/i },
    { name: 'TWS', pattern: /\bTWS\b/ },
    { name: 'ZEROBASEONE', pattern: /\bZEROBASEONE\b/i },
    { name: 'BOYNEXTDOOR', pattern: /\bBOYNEXTDOOR\b/i },
    { name: 'Taemin', pattern: /\bTaemin\b/i },
    { name: 'IU', pattern: /\bIU\b(?!\w)/ },
    { name: 'BIBI', pattern: /\bBIBI\b/ },
  ];

  groups.forEach(({ name, pattern }) => {
    if (pattern.test(text)) {
      tags.add(name);
    }
  });

  if (/\bcomeback\b/i.test(text)) tags.add('Comeback');
  if (/\bdebut\b/i.test(text)) tags.add('Debut');
  if (/\bconcert\b/i.test(text)) tags.add('Concert');
  if (/\bawards?\b/i.test(text)) tags.add('Awards');
  if (/\bcharts?\b/i.test(text)) tags.add('Charts');
  if (/\balbum\b/i.test(text)) tags.add('Album');
  if (/\bmusic video\b|\bMV\b/i.test(text)) tags.add('MV');
  if (/\btour\b/i.test(text)) tags.add('Tour');
  if (/\bK-Drama\b|\bkdrama\b|\bdrama\b/i.test(text)) tags.add('K-Drama');

  return Array.from(tags).slice(0, 5);
}

function main() {
  if (!fs.existsSync(contentDirectory)) {
    console.error('Content directory not found:', contentDirectory);
    process.exit(1);
  }

  const files = fs.readdirSync(contentDirectory).filter((f) => f.endsWith('.md'));
  let fixedCount = 0;
  let unchangedCount = 0;

  for (const file of files) {
    const filePath = path.join(contentDirectory, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);

    const oldTags: string[] = data.tags || [];
    const newTags = extractTags(data.title || '', content);

    // Check if tags changed
    const oldSet = new Set(oldTags.map((t: string) => t.toLowerCase()));
    const newSet = new Set(newTags.map((t) => t.toLowerCase()));
    const changed =
      oldSet.size !== newSet.size ||
      Array.from(oldSet).some((t) => !newSet.has(t)) ||
      Array.from(newSet).some((t) => !oldSet.has(t));

    if (changed) {
      data.tags = newTags;

      // Rebuild file with updated frontmatter
      const updatedContent = matter.stringify(content, data);
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`✓ ${file}`);
      console.log(`  Old: [${oldTags.join(', ')}]`);
      console.log(`  New: [${newTags.join(', ')}]`);
      fixedCount++;
    } else {
      unchangedCount++;
    }
  }

  console.log(`\nDone! Fixed: ${fixedCount}, Unchanged: ${unchangedCount}, Total: ${files.length}`);
}

main();
