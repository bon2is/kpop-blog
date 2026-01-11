# KPOP Daily 6개월 완전 실행 계획서
**Version 1.0 | 2026-01-12**

---

## 개요

| 항목 | 내용 |
|------|------|
| **사이트** | https://kpop.andxo.com |
| **기술 스택** | Next.js 14, Vercel, OpenAI, Mailchimp, GA4 |
| **기간** | 2026년 1월 ~ 6월 (6개월) |
| **브랜치** | `socialgrowup` |

### 목표

| 지표 | 현재 | 6개월 후 |
|------|------|----------|
| 월간 PV | 0 | 2,000,000 |
| 이메일 구독자 | 0 | 50,000 |
| TikTok 팔로워 | 0 | 100,000 |
| Instagram 팔로워 | 0 | 50,000 |
| 월 수익 | $0 | $5,000 |

---

# Phase 1: 기초 인프라 (Week 1-2)

## 1.1 JSON-LD 구조화 데이터

### 파일 생성: `src/components/StructuredData.tsx`

```typescript
import { Article } from '@/types';

interface ArticleSchemaProps {
  article: Article;
  url: string;
}

// JSON-LD 스키마 생성 함수 (서버사이드에서 안전하게 생성)
function createArticleSchema(article: Article, url: string) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "description": article.excerpt,
    "image": `https://kpop.andxo.com${article.thumbnail}`,
    "datePublished": article.publishedAt,
    "dateModified": article.updatedAt || article.publishedAt,
    "author": {
      "@type": "Organization",
      "name": "KPOP Daily",
      "url": "https://kpop.andxo.com"
    },
    "publisher": {
      "@type": "Organization",
      "name": "KPOP Daily",
      "logo": {
        "@type": "ImageObject",
        "url": "https://kpop.andxo.com/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": url
    }
  };
}

export function ArticleSchema({ article, url }: ArticleSchemaProps) {
  const schema = createArticleSchema(article, url);
  // 서버에서 생성되는 정적 JSON이므로 XSS 위험 없음
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
    >
      {JSON.stringify(schema)}
    </script>
  );
}

export function WebsiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "KPOP Daily",
    "url": "https://kpop.andxo.com",
    "description": "K-Pop and K-Drama news with AI-curated summaries",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://kpop.andxo.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
    >
      {JSON.stringify(schema)}
    </script>
  );
}

export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
    >
      {JSON.stringify(schema)}
    </script>
  );
}
```

### 파일 수정: `src/app/article/[slug]/page.tsx`

```typescript
// 상단에 import 추가
import { ArticleSchema, BreadcrumbSchema } from '@/components/StructuredData';

// generateMetadata 함수에 추가
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticleBySlug(params.slug);
  if (!article) return { title: 'Article Not Found' };

  const url = `https://kpop.andxo.com/article/${article.slug}`;

  return {
    title: article.title,
    description: article.excerpt,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url,
      type: 'article',
      publishedTime: article.publishedAt,
      images: [{ url: `https://kpop.andxo.com${article.thumbnail}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.excerpt,
      images: [`https://kpop.andxo.com${article.thumbnail}`],
    },
  };
}

// 컴포넌트 내부에 추가
export default function ArticlePage({ params }: Props) {
  const article = getArticleBySlug(params.slug);
  const url = `https://kpop.andxo.com/article/${article.slug}`;

  const breadcrumbs = [
    { name: 'Home', url: 'https://kpop.andxo.com' },
    { name: article.category, url: `https://kpop.andxo.com/category/${article.category.toLowerCase()}` },
    { name: article.title, url }
  ];

  return (
    <>
      <ArticleSchema article={article} url={url} />
      <BreadcrumbSchema items={breadcrumbs} />
      {/* 기존 컴포넌트 */}
    </>
  );
}
```

---

## 1.2 RSS 피드 생성

### 파일 생성: `src/app/feed.xml/route.ts`

```typescript
import { getAllArticles } from '@/lib/articles';

export async function GET() {
  const articles = getAllArticles().slice(0, 50);
  const baseUrl = 'https://kpop.andxo.com';
  const now = new Date().toUTCString();

  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const rssItems = articles.map(article => `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${baseUrl}/article/${article.slug}</link>
      <description><![CDATA[${article.excerpt}]]></description>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
      <guid isPermaLink="true">${baseUrl}/article/${article.slug}</guid>
      <category>${escapeXml(article.category)}</category>
      <enclosure url="${baseUrl}${article.thumbnail}" type="image/webp"/>
    </item>`).join('\n');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>KPOP Daily</title>
    <link>${baseUrl}</link>
    <description>K-Pop and K-Drama news with AI-curated summaries and original commentary</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/logo.png</url>
      <title>KPOP Daily</title>
      <link>${baseUrl}</link>
    </image>
${rssItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
```

---

## 1.3 robots.txt 최적화

### 파일 수정: `public/robots.txt`

```txt
# KPOP Daily - kpop.andxo.com
User-agent: *
Allow: /

# Sitemaps
Sitemap: https://kpop.andxo.com/sitemap.xml

# RSS Feed
# Available at: https://kpop.andxo.com/feed.xml

# Crawl delay
Crawl-delay: 1

# Disallow internal paths
Disallow: /api/
Disallow: /_next/
Disallow: /admin/

# Allow AI crawlers for better indexing
User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 1
```

---

## 1.4 이미지 최적화 컴포넌트

### 파일 생성: `src/components/OptimizedImage.tsx`

```typescript
'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  fill?: boolean;
  sizes?: string;
}

export default function OptimizedImage({
  src,
  alt,
  priority = false,
  className = '',
  fill = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => setIsLoading(false);
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={`bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center ${className}`}>
        <span className="text-gray-400 text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill={fill}
        priority={priority}
        sizes={sizes}
        className={`
          object-cover transition-all duration-500
          ${isLoading ? 'blur-sm scale-105' : 'blur-0 scale-100'}
        `}
        onLoad={handleLoad}
        onError={handleError}
        unoptimized
        {...props}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100 to-purple-100 animate-pulse" />
      )}
    </div>
  );
}
```

---

## 1.5 Lazy Loading 섹션

### 의존성 설치

```bash
npm install react-intersection-observer
```

### 파일 생성: `src/components/LazySection.tsx`

```typescript
'use client';

import { useInView } from 'react-intersection-observer';
import { ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
  fallbackHeight?: string;
}

export default function LazySection({
  children,
  className = '',
  threshold = 0.1,
  fallbackHeight = 'h-64'
}: LazySectionProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold,
    rootMargin: '100px',
  });

  return (
    <div ref={ref} className={className}>
      {inView ? (
        children
      ) : (
        <div className={`${fallbackHeight} bg-gradient-to-br from-gray-100 to-gray-50 animate-pulse rounded-xl`} />
      )}
    </div>
  );
}
```

---

## 1.6 vercel.json 헤더 설정

### 파일 생성: `vercel.json`

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/images/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/feed.xml",
      "headers": [
        {
          "key": "Content-Type",
          "value": "application/rss+xml; charset=utf-8"
        },
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

---

## Phase 1 체크리스트

```
[ ] StructuredData.tsx 생성
[ ] 각 기사 페이지에 JSON-LD 추가
[ ] layout.tsx에 WebsiteSchema 추가
[ ] RSS feed.xml/route.ts 생성
[ ] robots.txt 업데이트
[ ] OptimizedImage.tsx 생성
[ ] LazySection.tsx 생성
[ ] react-intersection-observer 설치
[ ] Google Search Console에서 도메인 확인
[ ] sitemap.xml 제출
[ ] vercel.json 생성
[ ] Core Web Vitals 테스트 (Lighthouse)
```

### 성공 기준
- [ ] 모든 기사에 JSON-LD 적용
- [ ] RSS 피드 /feed.xml 접근 가능
- [ ] Google Search Console 인덱싱 오류 0
- [ ] Lighthouse SEO 점수 > 95
- [ ] LCP < 2.5s, FID < 100ms, CLS < 0.1

---

# Phase 2: 콘텐츠 가속화 (Week 3-4)

## 2.1 다중 RSS 소스 추가

### 파일 수정: `scripts/fetch-news.ts`

```typescript
// RSS_FEEDS 배열을 다음으로 교체
const RSS_FEEDS = [
  // 기존 소스
  { name: 'Soompi', url: 'https://www.soompi.com/feed', enabled: true, priority: 1 },
  { name: 'Koreaboo', url: 'https://www.koreaboo.com/feed/', enabled: true, priority: 1 },
  { name: 'Korea Herald', url: 'https://www.koreaherald.com/rss/028.xml', enabled: true, priority: 2 },

  // 신규 소스
  { name: 'NME K-Pop', url: 'https://www.nme.com/topic/k-pop/feed', enabled: true, priority: 2 },
  { name: 'KpopMap', url: 'https://www.kpopmap.com/feed/', enabled: true, priority: 2 },
  { name: 'SBS PopAsia', url: 'https://www.sbs.com.au/popasia/feed', enabled: true, priority: 3 },

  // 테스트 필요 소스 (enabled: false)
  { name: 'AllKpop', url: 'https://www.allkpop.com/rss', enabled: false, priority: 1 },
];

// 활성화된 소스만 필터링
const activeSources = RSS_FEEDS.filter(s => s.enabled);
```

---

## 2.2 기사 빈도 증가 (4회/일)

### 파일 수정: `.github/workflows/fetch-and-deploy.yml`

```yaml
name: Fetch News & Deploy

on:
  schedule:
    # 1일 4회: 08:00, 14:00, 20:00, 02:00 KST
    - cron: '0 23 * * *'   # 08:00 KST (전날 23:00 UTC)
    - cron: '0 5 * * *'    # 14:00 KST
    - cron: '0 11 * * *'   # 20:00 KST
    - cron: '0 17 * * *'   # 02:00 KST
  workflow_dispatch:
    inputs:
      max_articles:
        description: 'Maximum articles to fetch (default: 8)'
        required: false
        default: '8'

env:
  NODE_VERSION: '20'
  MAX_ARTICLES: 8
```

---

## 2.3 트렌딩 토픽 감지

### 파일 생성: `src/lib/trending.ts`

```typescript
import { Article } from '@/types';

interface TrendingTopic {
  keyword: string;
  count: number;
  articles: string[];
  trend: 'rising' | 'stable' | 'falling';
}

// K-Pop 그룹 및 아티스트 목록
const ARTISTS = [
  // 그룹
  'BTS', 'BLACKPINK', 'TWICE', 'NewJeans', 'aespa', 'IVE', 'LE SSERAFIM',
  'Stray Kids', 'SEVENTEEN', 'NCT', 'EXO', 'Red Velvet', 'ITZY', 'TXT',
  'ENHYPEN', 'NMIXX', 'Kep1er', 'ATEEZ', 'THE BOYZ', 'TREASURE',
  '(G)I-DLE', 'MAMAMOO', 'MONSTA X', 'GOT7', 'ASTRO', 'SF9',
  // 솔로 아티스트
  'IU', 'TAEYEON', 'Baekhyun', 'Taemin', 'Sunmi', 'Chungha', 'Hwasa',
  // BTS 멤버
  'RM', 'Jin', 'Suga', 'J-Hope', 'Jimin', 'V', 'Jungkook',
  // BLACKPINK 멤버
  'Jisoo', 'Jennie', 'Rose', 'Lisa',
  // NewJeans 멤버
  'Minji', 'Hanni', 'Danielle', 'Haerin', 'Hyein',
];

export function detectTrendingTopics(articles: Article[], days: number = 7): TrendingTopic[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recentArticles = articles.filter(a => new Date(a.publishedAt) > cutoff);
  const keywordMap = new Map<string, { count: number; articles: string[] }>();

  for (const article of recentArticles) {
    const text = `${article.title} ${article.content || ''}`.toLowerCase();

    for (const artist of ARTISTS) {
      if (text.includes(artist.toLowerCase())) {
        const existing = keywordMap.get(artist) || { count: 0, articles: [] };
        existing.count++;
        if (!existing.articles.includes(article.slug)) {
          existing.articles.push(article.slug);
        }
        keywordMap.set(artist, existing);
      }
    }
  }

  return Array.from(keywordMap.entries())
    .map(([keyword, data]) => ({
      keyword,
      count: data.count,
      articles: data.articles,
      trend: data.count >= 5 ? 'rising' : 'stable' as const,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}
```

---

## 2.4 태그 및 아티스트 페이지

### 파일 생성: `src/app/tag/[tag]/page.tsx`
### 파일 생성: `src/app/artist/[slug]/page.tsx`
### 파일 생성: `src/app/search/page.tsx`
### 파일 생성: `src/lib/artists.ts`

(상세 코드는 Phase 1과 유사한 패턴으로 구현)

---

## Phase 2 체크리스트

```
[ ] RSS 소스 추가 (KpopMap, NME K-Pop, SBS PopAsia)
[ ] GitHub Actions 4회/일 스케줄로 변경
[ ] trending.ts 생성
[ ] TrendingTopics.tsx 생성
[ ] 홈페이지에 트렌딩 섹션 추가
[ ] /tag/[tag] 페이지 생성
[ ] /artist/[slug] 페이지 생성
[ ] /search 페이지 생성
[ ] search-index.json 생성 스크립트 추가
```

### 성공 기준
- [ ] 4회/일 자동 기사 수집 동작
- [ ] 100+ 기사 발행
- [ ] 태그 페이지 Google 인덱싱
- [ ] 상위 10개 아티스트 페이지 완성
- [ ] 검색 기능 동작

---

# Phase 3: 커뮤니티 구축 (Month 2)

## 3.1 Giscus 댓글 시스템

### 사전 준비
1. GitHub에서 `kpop-blog` 리포지토리의 Discussions 활성화
2. https://giscus.app 에서 설정 생성
3. Repository ID 및 Category ID 복사

### 파일 생성: `src/components/Comments.tsx`

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';

interface CommentsProps {
  slug: string;
  title: string;
}

export default function Comments({ slug, title }: CommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || isLoaded) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'bon2is/kpop-blog');
    script.setAttribute('data-repo-id', 'YOUR_REPO_ID');
    script.setAttribute('data-category', 'Article Comments');
    script.setAttribute('data-category-id', 'YOUR_CATEGORY_ID');
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', slug);
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-theme', 'light');
    script.setAttribute('data-lang', 'en');
    script.async = true;
    script.crossOrigin = 'anonymous';

    containerRef.current.appendChild(script);
    setIsLoaded(true);
  }, [slug, isLoaded]);

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-6 h-6 text-pink-500" />
        <h2 className="text-2xl font-bold text-gray-900">Comments</h2>
      </div>
      <div ref={containerRef} className="giscus min-h-[200px]" />
    </section>
  );
}
```

---

## 3.2 리액션 시스템

### 파일 생성: `src/components/ArticleReactions.tsx`

(로컬스토리지 기반 리액션 시스템 - Love, Like, Wow, Fire, Celebrate)

---

## 3.3 투표/폴링 시스템

### 파일 생성: `src/components/Poll.tsx`

(주간 투표 기능 - 로컬스토리지 기반)

---

## 3.4 향상된 뉴스레터

### 파일 생성: `src/components/NewsletterAdvanced.tsx`

(관심 아티스트/콘텐츠 타입 선택 기능)

---

## Phase 3 체크리스트

```
[ ] GitHub Discussions 활성화
[ ] Giscus 앱 설치 및 설정
[ ] Comments.tsx 생성 및 기사 페이지에 추가
[ ] ArticleReactions.tsx 생성
[ ] Poll.tsx 생성
[ ] NewsletterAdvanced.tsx 생성
[ ] Mailchimp 세그먼트 설정
```

### 성공 기준
- [ ] 모든 기사에 댓글 기능 활성화
- [ ] 1,000+ 뉴스레터 구독자
- [ ] 평균 기사당 3+ 리액션
- [ ] 주간 투표 50+ 참여

---

# Phase 4: 소셜 미디어 확장 (Month 2-3)

## 4.1 소셜 계정 생성

| 플랫폼 | 계정명 | 콘텐츠 유형 |
|--------|--------|-------------|
| Twitter | @kpopdaily_news | 기사 링크, 속보 |
| Instagram | @kpopdaily_official | 이미지 카드, 스토리 |
| TikTok | @kpopdaily | 뉴스 요약 영상 |

## 4.2 자동 포스팅 시스템

### 파일 생성: `scripts/post-to-social.ts`

```typescript
// Twitter API v2, Meta Graph API 연동
// 새 기사 발행 시 자동 포스팅
```

### 파일 생성: `.github/workflows/social-post.yml`

```yaml
name: Post to Social Media
on:
  push:
    paths:
      - 'content/posts/*.md'
```

## 4.3 비디오 생성 (선택)

### 파일 생성: `scripts/generate-video.ts`

```typescript
// OpenAI TTS + FFmpeg로 뉴스 영상 생성
// TikTok/Reels용 세로형 영상
```

---

## Phase 4 체크리스트

```
[ ] Twitter 개발자 계정 신청
[ ] Instagram Business 계정 생성
[ ] TikTok 개발자 등록
[ ] post-to-social.ts 생성
[ ] social-post.yml 워크플로우 생성
[ ] Footer에 소셜 링크 추가
```

### 성공 기준
- [ ] Twitter 5K+ 팔로워
- [ ] Instagram 10K+ 팔로워
- [ ] TikTok 25K+ 팔로워
- [ ] 주간 소셜 유입 500+ 클릭

---

# Phase 5: 수익화 (Month 3-4)

## 5.1 AdSense 최적화

| 위치 | 형식 | 예상 RPM |
|------|------|----------|
| 헤더 아래 | 리더보드 728x90 | $2-5 |
| 기사 중간 | 인피드 네이티브 | $3-7 |
| 사이드바 | 스카이스크래퍼 300x600 | $1-3 |
| 기사 하단 | 디스플레이 336x280 | $2-4 |

## 5.2 제휴 마케팅

| 플랫폼 | 카테고리 | 커미션 |
|--------|----------|--------|
| Amazon | 앨범, 굿즈 | 4-8% |
| YesAsia | K-Pop 앨범 | 5-10% |
| Weverse Shop | 공식 굿즈 | 5-8% |

### 파일 생성: `src/lib/affiliates.ts`

```typescript
// 기사 내 자동 제휴 링크 삽입
```

## 5.3 프리미엄 콘텐츠 (선택)

### 파일 생성: `src/app/premium/page.tsx`

| 티어 | 가격 | 혜택 |
|------|------|------|
| Free | $0 | 기본 뉴스, 광고 있음 |
| Fan | $3/월 | 광고 없음, 얼리 액세스 |
| Stan | $7/월 | + 독점 콘텐츠, 디스코드 |

---

## Phase 5 체크리스트

```
[ ] AdSense 승인 완료
[ ] 광고 배치 최적화
[ ] Amazon Associates 가입
[ ] affiliates.ts 생성
[ ] 기사 내 제휴 링크 자동 삽입
[ ] (선택) Stripe 연동
[ ] (선택) 프리미엄 페이지 생성
```

### 성공 기준
- [ ] AdSense 월 $500+
- [ ] 제휴 수익 월 $200+
- [ ] 총 월 수익 $1,000+

---

# Phase 6: 글로벌 확장 (Month 4-6)

## 6.1 다국어 지원

### 의존성 설치

```bash
npm install next-intl
```

### 지원 언어

| 순위 | 언어 | 코드 | 이유 |
|------|------|------|------|
| 1 | 영어 | en | 기본 |
| 2 | 한국어 | ko | K-Pop 본고장 |
| 3 | 일본어 | ja | 주요 시장 |
| 4 | 스페인어 | es | 라틴 아메리카 |
| 5 | 포르투갈어 | pt | 브라질 |
| 6 | 중국어 | zh | 아시아 시장 |

### 파일 생성: `src/i18n.ts`
### 파일 생성: `src/messages/[locale].json`
### 파일 생성: `src/app/[locale]/layout.tsx`
### 파일 생성: `src/components/LanguageSelector.tsx`

## 6.2 AI 번역 파이프라인

### 파일 생성: `scripts/translate-content.ts`

```typescript
// GPT-4o-mini로 기사 번역
// K-Pop 용어는 원문 유지
```

## 6.3 hreflang 태그

```typescript
alternates: {
  canonical: `https://kpop.andxo.com/${locale}/article/${slug}`,
  languages: {
    'en': `/en/article/${slug}`,
    'ko': `/ko/article/${slug}`,
    'ja': `/ja/article/${slug}`,
    'es': `/es/article/${slug}`,
    'pt': `/pt/article/${slug}`,
    'zh': `/zh/article/${slug}`,
    'x-default': `/en/article/${slug}`,
  },
}
```

---

## Phase 6 체크리스트

```
[ ] next-intl 설치
[ ] i18n.ts 설정
[ ] 6개 언어 메시지 파일 생성
[ ] [locale] 라우팅 구조 변경
[ ] LanguageSelector.tsx 생성
[ ] translate-content.ts 생성
[ ] hreflang 태그 추가
[ ] 지역별 Google Search Console 설정
```

### 성공 기준
- [ ] 6개 언어 지원
- [ ] 비영어권 트래픽 20%+
- [ ] 각 언어별 SEO 인덱싱 완료

---

# 종합 타임라인

| 주차 | Phase | 핵심 작업 | 예상 비용 |
|------|-------|----------|----------|
| 1-2 | Phase 1 | SEO, 성능 최적화, RSS | $0 |
| 3-4 | Phase 2 | 콘텐츠 증가, 검색, 아티스트 페이지 | +$10/월 |
| 5-8 | Phase 3 | 댓글, 투표, 뉴스레터 | $0 |
| 9-12 | Phase 4 | 소셜 미디어 자동화 | +$50/월 |
| 13-16 | Phase 5 | AdSense, 제휴, 스폰서 | 수익 시작 |
| 17-24 | Phase 6 | 다국어, 글로벌 확장 | +$30/월 |

---

# 필수 외부 서비스

| 서비스 | 용도 | 비용 |
|--------|------|------|
| Google Search Console | SEO 모니터링 | 무료 |
| Google Analytics 4 | 트래픽 분석 | 무료 |
| Giscus | 댓글 시스템 | 무료 |
| Mailchimp | 뉴스레터 | 무료 (10K 이하) |
| Twitter API | 자동 포스팅 | 무료 티어 |
| Meta Graph API | Instagram 포스팅 | 무료 |
| Google AdSense | 광고 수익 | 무료 |
| Stripe | 결제 처리 | 수수료 2.9%+30¢ |

---

# NPM 의존성 요약

```bash
# Phase 1
npm install react-intersection-observer

# Phase 6
npm install next-intl
```

---

# 월별 KPI 목표

| 지표 | M1 | M2 | M3 | M4 | M5 | M6 |
|------|----|----|----|----|----|----|
| 월간 PV | 10만 | 30만 | 60만 | 100만 | 150만 | 200만 |
| 일일 방문자 | 3K | 10K | 20K | 33K | 50K | 66K |
| 이메일 구독 | 1K | 5K | 15K | 25K | 40K | 50K |
| TikTok | 1K | 10K | 30K | 50K | 75K | 100K |
| Instagram | 500 | 5K | 15K | 25K | 40K | 50K |
| 월 수익 | $50 | $200 | $500 | $1.5K | $3K | $5K |

---

# 리스크 및 대응

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| API 비용 초과 | 중 | 중 | 일일 한도 설정, 캐싱 |
| 저작권 이슈 | 중 | 고 | 원본 링크 필수, AI 이미지만 사용 |
| 소셜 계정 정지 | 낮 | 고 | 가이드라인 준수, 백업 계정 |
| AdSense 거부 | 낮 | 중 | 콘텐츠 품질 관리 |
| 경쟁사 출현 | 중 | 중 | 차별화된 AI 이미지, 속도 |

### 백업 계획

- OpenAI 비용 상승 -> GPT-3.5 또는 Claude API 전환
- DALL-E 제한 -> Midjourney API 또는 Stable Diffusion
- Vercel 한도 초과 -> Cloudflare Pages 전환
- 소스 사이트 차단 -> 대체 소스 확보

---

*문서 버전: 1.0*
*작성일: 2026-01-12*
*다음 리뷰: Phase 1 완료 후*
