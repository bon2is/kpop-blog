# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev                    # Start Next.js dev server (localhost:3000)
npm run build                  # Production build: generate-feeds + fetch-charts + next build
npm run lint                   # Next.js ESLint

# Article pipeline
npm run fetch-news             # Fetch RSS → AI rewrite → save markdown + upload thumbnail to R2
MAX_ARTICLES=3 npm run fetch-news  # Limit articles per run

# Social posting (run after fetch-news)
npm run post-threads           # Post to Threads
npm run post-twitter           # Post to Twitter/X
npm run post-bluesky           # Post to Bluesky
npm run post-pinterest         # Post to Pinterest
npm run post-discord           # Post to Discord
npm run generate-and-post      # Full pipeline: fetch + all social posts

# Run TypeScript scripts directly
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/fetch-news.ts
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/fix-tags.ts
```

## Architecture

### ISR Site + Automated Content Pipeline

This is a **Next.js 14 site using ISR / on-demand rendering** deployed on Vercel at https://kpop.andxo.com. It was migrated off `output: 'export'` (which rebuilt all ~2,585 pages on every deploy and caused build timeouts once articles passed ~1,400).

**Deploy is now lightweight and independent of article count:**
- Dynamic routes set `export const dynamicParams = true` + `export const revalidate = false`.
- `article/[slug]` prebuilds only the **most recent 30** articles (`PREBUILD_RECENT_COUNT`); `tag/[slug]` prebuilds **none**. All other slugs generate on first request, then cache on the CDN until the next deploy.
- `next.config.js` uses `experimental.outputFileTracingIncludes: { '/**': ['./content/posts/**', './public/data/**'] }` so serverless functions can read the markdown/data files at runtime — the file tracer cannot auto-detect `fs.readdirSync` of a dynamic directory, so without this the lambdas throw ENOENT in production.
- **Vercel dashboard must NOT have a manual `Output Directory: out` override** (leftover from the static-export era) — Framework Preset must be Next.js with the default output.

**Content flow:**
1. GitHub Actions (`.github/workflows/fetch-and-deploy.yml`) runs 4× daily (01/05/11/14 UTC)
2. `scripts/fetch-news.ts` parses RSS from Soompi, Koreaboo, Korea Herald
3. Articles are rewritten via **Groq API** (CI env: `GROQ_API_KEY`) and saved as markdown to `content/posts/`
4. Thumbnails are uploaded to **Cloudflare R2** (S3-compatible, env: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`)
5. Git push triggers Vercel rebuild automatically

**Article storage:** `content/posts/<slug>.md` — YAML frontmatter (title, category, tags, thumbnail, publishedAt, sourceUrl, isAIGenerated, etc.) + markdown body.

### Critical: Module-Level Article Cache

`src/lib/articles.ts` holds a **module-level cache** (`articlesCache`, `tagDocFreqCache`) that is populated once per process. During `next build`, hundreds of static pages call `getAllArticles()` — the cache prevents redundant filesystem reads, reducing build time from ~35 min to ~12 min. Never move this cache inside a function or add a bypass without measuring build impact.

### Key Types (`src/types/index.ts`)

- `Article` — full article including content, summary, commentary, readingTime
- `ArticleSummary` — lightweight variant omitting content/summary/commentary; used in client components to avoid shipping full markdown to the browser
- `Category` — union of 10 literal strings: kpop, kdrama, variety, music, awards, fashion, dating, tour, debut, other

### Related Articles Algorithm

`getRelatedArticles()` uses TF-IDF-like scoring:
- `ARTIST_TAG_WEIGHT = 5` — artist name tags count 5× more than other tags
- `SAME_CATEGORY_WEIGHT = 1` — same category adds to score
- `RECENCY_BONUS = 2` — articles within 90 days receive a recency bonus

### Social Tracker

`scripts/lib/social-url.ts` manages a YAML tracker file to prevent duplicate social posts. Each platform records which article slugs have been posted. `post-backlog.ts` posts untracked articles retroactively (Twitter/Bluesky only — Threads is excluded from backlog to avoid duplicates).

### GA4 Hardcoded in `layout.tsx` and `GoogleAnalytics.tsx`

GA4 ID (`G-YQYVZJ28RZ`) is **hardcoded** directly in `src/app/layout.tsx` and `src/components/GoogleAnalytics.tsx`, not via `NEXT_PUBLIC_GA_ID`. This is intentional: `NEXT_PUBLIC_*` variables bind at build time, and a missing Vercel env var causes `undefined` to be bundled permanently. For any public tracking IDs (GA, AdSense), hardcode them directly rather than relying on env vars.

A separate `GoogleAnalytics` client component uses `usePathname()` to fire `gtag('config')` on SPA route changes.

### AdSense Auto Ads Compatibility

`src/app/layout.tsx` loads the AdSense script once in production with id `adsbygoogle-js`. This supports AdSense Auto Ads overlay formats configured in the AdSense console. Manual ad units in `src/components/AdBanner.tsx` still render their `<ins>` tags and call `push({})`; `ensureAdsScript()` checks for the same script id and will not inject a duplicate loader.

Recommended console setup for this codebase: Auto Ads ON, Overlay formats ON, In-page formats OFF. The code already controls in-page/manual placements.

## Gotchas

**TypeScript Set iteration:** Scripts compile with `"module":"commonjs"`. Use `Array.from(set)` instead of `[...set]` — Set spread fails at runtime with CommonJS target.

**Artist name regex:** Short names (IVE, IU, BTS, TXT, EXO) match inside longer words with naive `text.includes()`. Always use word-boundary regex: `\bIVE\b(?!\w)`. Naive matching caused 168 false-positive tag matches for IVE before the fix.

**`vercel.json` redirects:** The file is ~1700 lines of permanent redirect rules mapping old slug formats (with 8-char hash suffix, e.g. `/article/slug-abc12345`) to clean slugs. This is a one-time migration artifact — do not edit manually.

**Thumbnail image strategy:** The intended source priority is: artist official photos → YouTube thumbnails → Cloudflare Workers AI fallback. Using `og:image` from the original news article (which may include editorial/watermarked images) is **not** the intended behavior and should be avoided when modifying `fetchOriginalArticleMedia()` in `scripts/fetch-news.ts`.

**Coupang API:** Returns 401 from non-Korean IP addresses (Vercel build servers). `CoupangBanner` returns `null` on empty product arrays and does not break the build.

**Static site limits:** No server runtime means no cross-user data sharing. Engagement data (views, likes) lives in `localStorage`. Disqus comments require `NEXT_PUBLIC_DISQUS_SHORTNAME` env var to be set in Vercel dashboard.
