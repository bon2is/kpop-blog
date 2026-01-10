import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const IMAGES_DIR = path.join(process.cwd(), 'public/images/posts');
const CONTENT_DIR = path.join(process.cwd(), 'content/posts');

interface ConversionResult {
  file: string;
  originalSize: number;
  newSize: number;
  savings: string;
}

async function convertPNGtoWebP(): Promise<void> {
  console.log('🖼️  Image Optimization: PNG → WebP\n');

  if (!fs.existsSync(IMAGES_DIR)) {
    console.log('No images directory found.');
    return;
  }

  const files = fs.readdirSync(IMAGES_DIR);
  const pngFiles = files.filter((f) => f.endsWith('.png'));

  if (pngFiles.length === 0) {
    console.log('No PNG files to convert.');
    return;
  }

  console.log(`Found ${pngFiles.length} PNG file(s) to convert:\n`);

  const results: ConversionResult[] = [];

  for (const pngFile of pngFiles) {
    const pngPath = path.join(IMAGES_DIR, pngFile);
    const webpFile = pngFile.replace('.png', '.webp');
    const webpPath = path.join(IMAGES_DIR, webpFile);

    try {
      const originalSize = fs.statSync(pngPath).size;

      // Convert to WebP with quality optimization
      await sharp(pngPath)
        .webp({ quality: 85, effort: 6 })
        .toFile(webpPath);

      const newSize = fs.statSync(webpPath).size;
      const savings = (((originalSize - newSize) / originalSize) * 100).toFixed(1);

      results.push({
        file: pngFile,
        originalSize,
        newSize,
        savings: `${savings}%`,
      });

      console.log(`✅ ${pngFile}`);
      console.log(`   ${formatSize(originalSize)} → ${formatSize(newSize)} (${savings}% smaller)\n`);

      // Delete original PNG
      fs.unlinkSync(pngPath);
    } catch (error) {
      console.error(`❌ Error converting ${pngFile}:`, error);
    }
  }

  // Update article references
  console.log('\n📝 Updating article references...\n');
  await updateArticleReferences();

  // Summary
  const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalNew = results.reduce((sum, r) => sum + r.newSize, 0);
  const totalSavings = (((totalOriginal - totalNew) / totalOriginal) * 100).toFixed(1);

  console.log('='.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   Files converted: ${results.length}`);
  console.log(`   Original size: ${formatSize(totalOriginal)}`);
  console.log(`   New size: ${formatSize(totalNew)}`);
  console.log(`   Total savings: ${totalSavings}% (${formatSize(totalOriginal - totalNew)})\n`);
}

async function updateArticleReferences(): Promise<void> {
  if (!fs.existsSync(CONTENT_DIR)) return;

  const files = fs.readdirSync(CONTENT_DIR);
  const mdFiles = files.filter((f) => f.endsWith('.md'));

  let updatedCount = 0;

  for (const mdFile of mdFiles) {
    const filePath = path.join(CONTENT_DIR, mdFile);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Replace .png references with .webp in thumbnail field
    if (content.includes('/images/posts/') && content.includes('.png')) {
      const newContent = content.replace(
        /(thumbnail:\s*["']\/images\/posts\/[^"']+)\.png(["'])/g,
        '$1.webp$2'
      );

      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent);
        console.log(`   Updated: ${mdFile}`);
        updatedCount++;
      }
    }
  }

  console.log(`   Total articles updated: ${updatedCount}`);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Run
convertPNGtoWebP().catch(console.error);
