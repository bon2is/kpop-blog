/**
 * migrate-slugs.ts
 * Removes the 12-char hex hash suffix from article filenames, thumbnail images,
 * frontmatter thumbnail paths, and .threads-posted.json entries.
 *
 * Before: enhypen-sets-new-record-with-the-sin-vanish-7ae5aa216269.md
 * After:  enhypen-sets-new-record-with-the-sin-vanish.md
 *
 * Usage: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-slugs.ts
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const POSTS_DIR = path.join(process.cwd(), 'content/posts');
const IMAGES_DIR = path.join(process.cwd(), 'public/images/posts');
const THREADS_FILE = path.join(process.cwd(), 'content/.threads-posted.json');

// Match the 12-char hex suffix pattern at end of filename (before extension)
const HASH_PATTERN = /-[a-f0-9]{12}$/;

function removeHash(slug: string): string {
  return slug.replace(HASH_PATTERN, '');
}

function main() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));

  const slugMap: Map<string, string> = new Map(); // oldSlug -> newSlug
  let renamedPosts = 0;
  let renamedImages = 0;
  let collisions = 0;

  // Phase 1: Build slug map and check for collisions
  const newSlugs = new Set<string>();
  for (const file of files) {
    const oldSlug = file.replace('.md', '');
    const newSlug = removeHash(oldSlug);

    if (oldSlug === newSlug) {
      // No hash suffix found, skip
      continue;
    }

    if (newSlugs.has(newSlug)) {
      console.error(`COLLISION: ${oldSlug} -> ${newSlug} (already exists)`);
      collisions++;
      continue;
    }

    newSlugs.add(newSlug);
    slugMap.set(oldSlug, newSlug);
  }

  if (collisions > 0) {
    console.error(`\nAborting: ${collisions} collision(s) detected.`);
    process.exit(1);
  }

  console.log(`Found ${slugMap.size} articles to migrate.\n`);

  // Phase 2: Rename files and update frontmatter
  slugMap.forEach((newSlug, oldSlug) => {
    const oldPath = path.join(POSTS_DIR, `${oldSlug}.md`);
    const newPath = path.join(POSTS_DIR, `${newSlug}.md`);

    // Read and update frontmatter
    const fileContent = fs.readFileSync(oldPath, 'utf-8');
    const { data, content } = matter(fileContent);

    // Update thumbnail path if it references the old slug
    if (data.thumbnail && data.thumbnail.includes(oldSlug)) {
      data.thumbnail = data.thumbnail.replace(oldSlug, newSlug);
    }

    // Write updated content to new path
    const updated = matter.stringify(content, data);
    fs.writeFileSync(newPath, updated, 'utf-8');

    // Remove old file
    if (oldPath !== newPath) {
      fs.unlinkSync(oldPath);
    }

    renamedPosts++;

    // Rename image file
    const oldImagePath = path.join(IMAGES_DIR, `${oldSlug}.webp`);
    const newImagePath = path.join(IMAGES_DIR, `${newSlug}.webp`);
    if (fs.existsSync(oldImagePath)) {
      fs.renameSync(oldImagePath, newImagePath);
      renamedImages++;
    }

    console.log(`✓ ${oldSlug} -> ${newSlug}`);
  });

  // Phase 3: Update .threads-posted.json
  if (fs.existsSync(THREADS_FILE)) {
    try {
      const threadsData = JSON.parse(fs.readFileSync(THREADS_FILE, 'utf-8'));
      if (Array.isArray(threadsData.posted)) {
        const updatedPosted = threadsData.posted.map((slug: string) => {
          const newSlug = slugMap.get(slug);
          return newSlug || slug;
        });
        threadsData.posted = updatedPosted;
        fs.writeFileSync(THREADS_FILE, JSON.stringify(threadsData, null, 2), 'utf-8');
        console.log(`\n✓ Updated .threads-posted.json (${updatedPosted.length} entries)`);
      }
    } catch (error) {
      console.error('Error updating .threads-posted.json:', error);
    }
  }

  console.log(`\nDone! Posts: ${renamedPosts}, Images: ${renamedImages}`);
}

main();
