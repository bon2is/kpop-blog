# KPOP Daily - Automated K-Pop News Blog

An automated K-Pop news blog that fetches, rewrites, and publishes articles from major K-Pop news sources using AI.

## Features

- **Automated Content**: Fetches news from AllKPop, Soompi, and Koreaboo RSS feeds
- **AI Rewriting**: Uses OpenAI GPT-4o-mini to create original content
- **Auto-Publishing**: GitHub Actions runs every 6 hours
- **SEO Optimized**: Built-in sitemap, meta tags, and structured data
- **Adsense Ready**: Pre-configured ad placement slots
- **Responsive Design**: Mobile-first design with Tailwind CSS

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd kpop
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
OPENAI_API_KEY=sk-your-openai-api-key
NEXT_PUBLIC_ADSENSE_ID=ca-pub-your-id
NEXT_PUBLIC_GA_ID=G-your-id
```

### 3. Local Development

```bash
npm run dev
```

Visit http://localhost:3000

### 4. Manual News Fetch (Testing)

```bash
npm run fetch-news
```

## Deployment to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kpop-blog.git
git push -u origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
5. Click "Deploy"

### Step 3: Configure Custom Domain

1. In Vercel dashboard, go to Settings → Domains
2. Add `kpop.andxo.com`
3. Update DNS records:
   - Type: CNAME
   - Name: kpop
   - Value: cname.vercel-dns.com

### Step 4: Setup GitHub Secrets

In your GitHub repo, go to Settings → Secrets → Actions:

1. Add `OPENAI_API_KEY` with your OpenAI API key

## Google Adsense Setup

1. Apply for Adsense at [adsense.google.com](https://adsense.google.com)
2. Once approved, get your Publisher ID (ca-pub-XXXX)
3. Update in `src/app/layout.tsx`:
   ```tsx
   src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR-ID"
   ```
4. Replace ad slots in `src/components/AdBanner.tsx`

## Project Structure

```
kpop/
├── .github/workflows/      # GitHub Actions
│   └── fetch-and-deploy.yml
├── content/
│   └── posts/              # Markdown articles
├── public/                 # Static assets
├── scripts/
│   └── fetch-news.ts       # News fetcher script
├── src/
│   ├── app/                # Next.js pages
│   ├── components/         # React components
│   ├── lib/                # Utilities
│   └── types/              # TypeScript types
└── package.json
```

## Automation Flow

```
┌─────────────────┐
│  GitHub Actions │
│  (Every 6 hrs)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Fetch RSS     │
│  (AllKPop,      │
│   Soompi, etc)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AI Rewrite     │
│  (OpenAI API)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save Markdown   │
│ (content/posts) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Git Commit    │
│   & Push        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vercel Deploy   │
│ (Auto-trigger)  │
└─────────────────┘
```

## Cost Estimation

- **Vercel**: Free tier (Hobby plan)
- **OpenAI API**: ~$0.01-0.02 per article (GPT-4o-mini)
  - ~40 articles/day = ~$0.40-0.80/day = ~$12-24/month

## Adding More Sources

Edit `scripts/fetch-news.ts`:

```typescript
const RSS_SOURCES = [
  { name: 'AllKPop', url: 'https://www.allkpop.com/rss', enabled: true },
  { name: 'Soompi', url: 'https://www.soompi.com/feed', enabled: true },
  // Add more sources here
  { name: 'NewSource', url: 'https://example.com/rss', enabled: true },
];
```

## Customization

### Change Categories

Edit `src/lib/config.ts` to modify categories.

### Modify AI Prompt

Edit the `rewriteArticle` function in `scripts/fetch-news.ts`.

### Update Design

Modify Tailwind classes in components and `tailwind.config.ts`.

## Troubleshooting

### Build Errors

```bash
npm run build
```

Check for TypeScript errors and fix them.

### RSS Fetch Issues

Some sites may block automated requests. Consider:
- Adding User-Agent headers
- Using proxy services
- Reducing fetch frequency

### OpenAI Rate Limits

The script includes 1-second delays between API calls. Adjust if needed.

## License

MIT

## Support

For issues, please open a GitHub issue.
