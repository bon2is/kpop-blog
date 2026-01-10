# AI-Powered News Blog Site Creation Guide

이 문서는 RSS 피드 기반 AI 뉴스 블로그 사이트를 처음부터 구축하기 위한 완전한 가이드입니다.

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [초기 설정](#3-초기-설정)
4. [프로젝트 구조](#4-프로젝트-구조)
5. [핵심 설정 파일](#5-핵심-설정-파일)
6. [RSS 피드 & AI 콘텐츠 생성](#6-rss-피드--ai-콘텐츠-생성)
7. [컴포넌트 구조](#7-컴포넌트-구조)
8. [광고 (Google AdSense)](#8-광고-google-adsense)
9. [분석 (Google Analytics)](#9-분석-google-analytics)
10. [뉴스레터 (Mailchimp)](#10-뉴스레터-mailchimp)
11. [GitHub Actions 자동화](#11-github-actions-자동화)
12. [Vercel 배포](#12-vercel-배포)
13. [커스텀 도메인 (Cloudflare)](#13-커스텀-도메인-cloudflare)
14. [SEO 설정](#14-seo-설정)
15. [법적 페이지](#15-법적-페이지)
16. [체크리스트](#16-체크리스트)

---

## 1. 프로젝트 개요

### 주요 기능
- RSS 피드에서 뉴스 자동 수집
- OpenAI GPT로 기사 요약 및 코멘터리 생성
- DALL-E 3로 아티클 썸네일 이미지 생성
- 정적 사이트 생성 (Static Export)
- GitHub Actions로 6시간마다 자동 업데이트
- AdSense 광고 수익화
- 뉴스레터 구독 기능

### 사이트 예시
- URL: https://kpop.andxo.com
- 주제: K-Pop / K-Drama 뉴스

---

## 2. 기술 스택

| 기술 | 용도 | 버전 |
|------|------|------|
| Next.js | 프레임워크 | 14.x |
| React | UI 라이브러리 | 18.x |
| TypeScript | 타입 안전성 | 5.x |
| Tailwind CSS | 스타일링 | 3.x |
| OpenAI API | 콘텐츠 생성 | GPT-4o-mini, DALL-E 3 |
| rss-parser | RSS 피드 파싱 | 3.x |
| sharp | 이미지 최적화 | 0.34.x |
| Vercel | 호스팅 | - |
| GitHub Actions | CI/CD 자동화 | - |

---

## 3. 초기 설정

### 3.1 프로젝트 생성

```bash
npx create-next-app@latest my-news-blog --typescript --tailwind --eslint
cd my-news-blog
```

### 3.2 필수 패키지 설치

```bash
npm install rss-parser openai gray-matter date-fns lucide-react cheerio node-fetch
npm install -D sharp ts-node dotenv
```

### 3.3 환경 변수 (.env)

```env
# OpenAI API
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx

# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Site Config
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

> **중요**: `.env`는 `.gitignore`에 포함. GitHub Secrets에 별도 등록 필요.

---

## 4. 프로젝트 구조

```
my-news-blog/
├── .github/
│   └── workflows/
│       └── fetch-and-deploy.yml    # GitHub Actions 워크플로우
├── content/
│   ├── posts/                      # 마크다운 기사 파일
│   └── .processed.json             # 처리된 URL 목록
├── public/
│   ├── images/
│   │   └── posts/                  # AI 생성 썸네일 (WebP)
│   └── ads.txt                     # AdSense 인증
├── scripts/
│   └── fetch-news.ts               # RSS 수집 & AI 생성 스크립트
├── src/
│   ├── app/
│   │   ├── layout.tsx              # 루트 레이아웃
│   │   ├── page.tsx                # 홈페이지
│   │   ├── article/[slug]/page.tsx # 기사 상세
│   │   ├── articles/page.tsx       # 전체 기사 목록
│   │   ├── category/[slug]/page.tsx# 카테고리별 보기
│   │   ├── search/page.tsx         # 검색 페이지
│   │   ├── privacy/page.tsx        # 개인정보처리방침
│   │   ├── terms/page.tsx          # 이용약관
│   │   └── sitemap.xml/route.ts    # 동적 사이트맵
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ArticleCard.tsx
│   │   ├── AdBanner.tsx            # AdSense 컴포넌트
│   │   ├── AdSenseScript.tsx       # AdSense 스크립트 로더
│   │   ├── GoogleAnalytics.tsx     # GA 스크립트
│   │   ├── Newsletter.tsx          # 뉴스레터 구독
│   │   └── ShareButtons.tsx        # 소셜 공유 버튼
│   └── lib/
│       ├── articles.ts             # 기사 데이터 유틸리티
│       ├── config.ts               # 사이트 설정
│       └── utils.ts                # 공통 유틸리티
├── .env                            # 환경 변수 (git 제외)
├── next.config.js                  # Next.js 설정
├── tailwind.config.ts              # Tailwind 설정
└── package.json
```

---

## 5. 핵심 설정 파일

### 5.1 next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',           // 정적 사이트 생성
  trailingSlash: true,        // URL 끝에 슬래시
  images: {
    unoptimized: true,        // 정적 export용
  },
};

module.exports = nextConfig;
```

### 5.2 src/lib/config.ts

```typescript
export const siteConfig = {
  name: 'Your Site Name',
  description: 'Your site description',
  url: 'https://your-domain.com',
  author: 'Your Name',
  email: 'admin@your-domain.com',
};

export const categories = [
  { name: 'News', slug: 'news', color: '#EC4899' },
  { name: 'Music', slug: 'music', color: '#8B5CF6' },
  // 주제에 맞게 카테고리 추가
];

export function getCategoryColor(slug: string): string {
  return categories.find(c => c.slug === slug)?.color || '#6B7280';
}
```

### 5.3 package.json scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "fetch-news": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' scripts/fetch-news.ts",
    "generate": "npm run fetch-news && npm run build"
  }
}
```

---

## 6. RSS 피드 & AI 콘텐츠 생성

### 6.1 RSS 소스 설정

```typescript
// scripts/fetch-news.ts

const RSS_SOURCES = [
  {
    name: 'Source Name',
    url: 'https://example.com/rss',
    enabled: true,
  },
  // 주제에 맞는 RSS 피드 추가
];
```

### 6.2 AI 콘텐츠 생성 흐름

```
RSS 피드 수집
    ↓
URL 중복 체크 (.processed.json)
    ↓
콘텐츠 중복 체크 (제목 유사도)
    ↓
GPT-4o-mini: 요약 + 코멘터리 생성
    ↓
DALL-E 3: 썸네일 이미지 생성
    ↓
Sharp: WebP 변환 & 최적화
    ↓
마크다운 파일 저장
```

### 6.3 중복 콘텐츠 감지 로직

```typescript
// Entity 기반 유사도 체크
function isDuplicateContent(newTitle: string, existingTitles: string[]): boolean {
  const newEntities = extractKeyEntities(newTitle);  // 그룹명, 인물명, 이벤트 추출

  for (const existingTitle of existingTitles) {
    const existingEntities = extractKeyEntities(existingTitle);

    // 70% 이상 entity 일치 시 중복
    const intersection = Array.from(newEntities).filter(x => existingEntities.has(x));
    const similarity = intersection.length / Math.min(newEntities.size, existingEntities.size);
    if (similarity >= 0.7) return true;
  }
  return false;
}
```

### 6.4 AI 이미지 프롬프트 예시

```typescript
const imagePrompt = `A hand-drawn anime illustration in the distinct style of Studio Ghibli,
rendered with warm watercolor textures and soft, natural lighting.
The image is a header graphic for a ${category} news article.
It features [character/scene description].
The overall atmosphere is [mood description].`;
```

### 6.5 마크다운 Frontmatter 구조

```yaml
---
title: "기사 제목"
excerpt: "짧은 요약"
summary: "2-3문장 요약"
commentary: "AI 분석/코멘터리"
originalTitle: "원본 기사 제목"
category: "news"
tags: ["Tag1", "Tag2"]
publishedAt: "2026-01-10T12:00:00.000Z"
updatedAt: "2026-01-10T12:00:00.000Z"
source: "원본 소스명"
sourceUrl: "https://original-article-url.com"
thumbnail: "/images/posts/article-slug.webp"
isAIGenerated: true
author: "Site Name"
---

기사 본문 내용...
```

---

## 7. 컴포넌트 구조

### 7.1 AdSense 스크립트 (src/components/AdSenseScript.tsx)

```tsx
'use client';

import { useEffect } from 'react';

const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';

export default function AdSenseScript() {
  useEffect(() => {
    if (document.querySelector(`script[src*="adsbygoogle"]`)) return;

    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }, []);

  return null;
}
```

> **중요**: Next.js `<Script>` 컴포넌트 대신 `document.createElement` 사용.
> Static export에서 `<Script>`가 appendChild 오류를 발생시킬 수 있음.

### 7.2 Google Analytics (src/components/GoogleAnalytics.tsx)

```tsx
'use client';

import { useEffect } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export default function GoogleAnalytics() {
  useEffect(() => {
    if (!GA_ID) return;

    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }, []);

  return null;
}

export function trackEvent(action: string, category: string, label?: string) {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
  });
}
```

### 7.3 Newsletter (Mailchimp JSONP)

```tsx
'use client';

import { useState, FormEvent } from 'react';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    const MAILCHIMP_U = 'your-u-value';
    const MAILCHIMP_ID = 'your-id-value';
    const url = `https://yourname.usX.list-manage.com/subscribe/post?u=${MAILCHIMP_U}&id=${MAILCHIMP_ID}`;

    // Hidden iframe 방식 (CORS 우회)
    const iframeName = 'mc_iframe_' + Date.now();
    const iframe = document.createElement('iframe');
    iframe.name = iframeName;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    const form = document.createElement('form');
    form.action = url;
    form.method = 'POST';
    form.target = iframeName;

    const emailInput = document.createElement('input');
    emailInput.type = 'hidden';
    emailInput.name = 'EMAIL';
    emailInput.value = email;
    form.appendChild(emailInput);

    document.body.appendChild(form);
    form.submit();

    setTimeout(() => {
      document.body.removeChild(form);
      document.body.removeChild(iframe);
    }, 5000);

    setStatus('success');
    setEmail('');
  };

  // ... render form
}
```

### 7.4 소셜 공유 버튼

```tsx
const shareLinks = [
  {
    name: 'Twitter',
    href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    bgColor: 'bg-black',
  },
  {
    name: 'Facebook',
    href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    bgColor: 'bg-[#1877F2]',
  },
  {
    name: 'KakaoTalk',
    onClick: () => window.open(`https://story.kakao.com/share?url=${encodedUrl}`),
    bgColor: 'bg-[#FEE500] text-black',
  },
];
```

---

## 8. 광고 (Google AdSense)

### 8.1 AdSense 계정 설정

1. https://adsense.google.com 에서 계정 생성
2. 사이트 등록 및 심사 요청
3. 승인 후 Publisher ID (ca-pub-XXXX) 및 슬롯 ID 확인

### 8.2 ads.txt 파일

```
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

> `public/ads.txt`에 저장. Publisher ID를 실제 값으로 교체.

### 8.3 광고 배치 위치

| 위치 | 컴포넌트 | 설명 |
|------|----------|------|
| 페이지 상단 | `<AdBanner />` | 메인 배너 |
| 기사 중간 | `<InArticleAd />` | 2번째 문단 이후 |
| 피드 내 | `<InFeedAd />` | 기사 목록 사이 |
| 사이드바 | `<SidebarAd />` | 데스크톱 사이드바 (sticky) |
| 페이지 하단 | `<BottomBannerAd />` | 푸터 위 |

---

## 9. 분석 (Google Analytics)

### 9.1 GA4 설정

1. https://analytics.google.com 에서 속성 생성
2. 데이터 스트림 추가 (웹)
3. Measurement ID (G-XXXXXXXX) 확인

### 9.2 Vercel 환경 변수 설정

```bash
vercel env add NEXT_PUBLIC_GA_ID
# G-XXXXXXXX 입력
```

### 9.3 커스텀 이벤트 추적

```typescript
// 뉴스레터 구독 추적
trackEvent('newsletter_signup', 'engagement', email.split('@')[1]);

// 기사 공유 추적
trackEvent('share', 'social', platform);
```

---

## 10. 뉴스레터 (Mailchimp)

### 10.1 Mailchimp 설정

1. https://mailchimp.com 무료 계정 생성
2. Audience (리스트) 생성
3. Signup forms → Embedded forms에서 form action URL 확인:
   ```
   https://yourname.usX.list-manage.com/subscribe/post?u=XXXX&id=XXXX
   ```
4. `u` 값과 `id` 값 추출

### 10.2 CORS 우회

Mailchimp는 CORS를 지원하지 않으므로:
- ❌ fetch/axios 직접 호출 불가
- ✅ Hidden iframe + form POST 방식 사용
- ✅ 또는 JSONP 방식 (`/subscribe/post-json`)

---

## 11. GitHub Actions 자동화

### 11.1 워크플로우 파일 (.github/workflows/fetch-and-deploy.yml)

```yaml
name: Fetch News & Deploy

on:
  schedule:
    - cron: '0 */6 * * *'  # 6시간마다
  workflow_dispatch:        # 수동 실행

env:
  NODE_VERSION: '20'

jobs:
  fetch-and-build:
    runs-on: ubuntu-latest
    concurrency:
      group: fetch-news
      cancel-in-progress: true

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.PAT_TOKEN }}
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Fetch news articles with AI content
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npm run fetch-news
        timeout-minutes: 15

      - name: Check for changes
        id: git-check
        run: |
          if git diff --quiet content/ public/images/posts/ 2>/dev/null; then
            echo "changes=false" >> $GITHUB_OUTPUT
          else
            echo "changes=true" >> $GITHUB_OUTPUT
          fi

      - name: Commit new articles
        if: steps.git-check.outputs.changes == 'true'
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add content/ public/images/posts/
          NEW_COUNT=$(git diff --cached --name-only | grep -c "content/posts/" || echo "0")
          git commit -m "Auto-update: ${NEW_COUNT} new article(s)" || exit 0
          git push

      - name: Build site
        run: npm run build
```

### 11.2 GitHub Secrets 설정

| Secret Name | 값 | 용도 |
|-------------|-----|------|
| `PAT_TOKEN` | GitHub Personal Access Token | Git push 권한 |
| `OPENAI_API_KEY` | OpenAI API 키 | 콘텐츠 생성 |

**PAT 생성**: https://github.com/settings/tokens/new?scopes=repo

---

## 12. Vercel 배포

### 12.1 초기 배포

```bash
npm install -g vercel
vercel login
vercel --prod
```

### 12.2 환경 변수 설정

```bash
vercel env add NEXT_PUBLIC_GA_ID production
vercel env add NEXT_PUBLIC_SITE_URL production
```

### 12.3 자동 배포

GitHub 연동 시 `main` 브랜치 push → 자동 배포

---

## 13. 커스텀 도메인 (Cloudflare)

### 13.1 Vercel에서 도메인 추가

1. Vercel 프로젝트 → Settings → Domains
2. 커스텀 도메인 입력 (예: blog.example.com)
3. CNAME 레코드 정보 확인

### 13.2 Cloudflare DNS 설정

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | blog | cname.vercel-dns.com | DNS only (회색 구름) |

> **중요**: Cloudflare Proxy (주황 구름)가 아닌 **DNS only** 사용.
> SSL은 Vercel에서 자동 발급.

---

## 14. SEO 설정

### 14.1 동적 Sitemap (src/app/sitemap.xml/route.ts)

```typescript
import { getAllArticles } from '@/lib/articles';
import { siteConfig, categories } from '@/lib/config';

export async function GET() {
  const articles = getAllArticles();

  const urls = [
    { loc: siteConfig.url, priority: 1, changefreq: 'hourly' },
    ...categories.map(cat => ({
      loc: `${siteConfig.url}/category/${cat.slug}`,
      priority: 0.9,
      changefreq: 'hourly',
    })),
    ...articles.map(article => ({
      loc: `${siteConfig.url}/article/${article.slug}`,
      lastmod: article.updatedAt,
      priority: 0.8,
      changefreq: 'weekly',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `<url>
  <loc>${u.loc}</loc>
  ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
  <changefreq>${u.changefreq}</changefreq>
  <priority>${u.priority}</priority>
</url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
```

### 14.2 Google Search Console

1. https://search.google.com/search-console
2. 속성 추가 (URL 접두어 방식)
3. Google Analytics로 소유권 확인
4. Sitemaps에서 `sitemap.xml` 제출

### 14.3 메타데이터 설정

```typescript
// src/app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    type: 'website',
    siteName: siteConfig.name,
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

---

## 15. 법적 페이지

### 15.1 개인정보처리방침 필수 항목

- 수집하는 정보 (IP, 브라우저, 쿠키)
- Google AdSense 사용 고지
- Google Analytics 사용 고지
- 제3자 광고 쿠키 설명
- 연락처 이메일

### 15.2 이용약관 필수 항목

- 서비스 설명 (AI 생성 콘텐츠 명시)
- 원본 소스 링크 정책
- AI 이미지 저작권 고지
- 면책 조항
- 연락처 이메일

---

## 16. 체크리스트

### 배포 전 체크리스트

- [ ] `.env` 파일 설정 완료
- [ ] `siteConfig` 값 변경
- [ ] RSS 소스 URL 설정
- [ ] 카테고리 및 색상 설정
- [ ] 로고 및 파비콘 추가
- [ ] ads.txt Publisher ID 변경
- [ ] 개인정보처리방침 이메일 변경
- [ ] 이용약관 이메일 변경

### 배포 후 체크리스트

- [ ] Vercel 환경 변수 설정 (GA_ID, SITE_URL)
- [ ] 커스텀 도메인 연결
- [ ] SSL 인증서 확인
- [ ] Google Search Console 등록
- [ ] Sitemap 제출
- [ ] AdSense 사이트 심사 요청
- [ ] GitHub Secrets 설정 (PAT_TOKEN, OPENAI_API_KEY)
- [ ] GitHub Actions 수동 실행 테스트
- [ ] Mailchimp 구독 테스트

### 운영 체크리스트

- [ ] 6시간마다 자동 기사 업데이트 확인
- [ ] AdSense 수익 모니터링
- [ ] Google Analytics 트래픽 확인
- [ ] 뉴스레터 구독자 확인
- [ ] 오류 발생 시 GitHub Actions 로그 확인

---

## API 비용 참고

| 서비스 | 예상 비용 (1회 실행) | 비고 |
|--------|---------------------|------|
| GPT-4o-mini | ~$0.01 | 기사당 ~1K tokens |
| DALL-E 3 | ~$0.40 | 기사당 1장 (1792x1024) |
| **총 (10개 기사)** | **~$4.10** | 하루 4회 = ~$16.40/일 |

> 비용 절감: DALL-E 3 → DALL-E 2 전환 시 ~$0.02/장

---

## 문제 해결

### Next.js Script 컴포넌트 오류

```
Failed to execute 'appendChild' on 'Node': Invalid or unexpected token
```

**해결**: `next/script` 대신 `document.createElement('script')` 사용

### Mailchimp CORS 오류

**해결**: fetch 대신 hidden iframe + form POST 방식 사용

### GitHub Actions PAT_TOKEN 오류

```
Input required and not supplied: token
```

**해결**: GitHub Secrets에 `PAT_TOKEN` 추가 (repo 권한 필요)

### DALL-E Rate Limit

**해결**: 기사 간 2초 딜레이 추가 (`setTimeout(resolve, 2000)`)

---

## 참고 링크

- [Next.js 문서](https://nextjs.org/docs)
- [Vercel 문서](https://vercel.com/docs)
- [OpenAI API](https://platform.openai.com/docs)
- [Google AdSense](https://support.google.com/adsense)
- [Mailchimp API](https://mailchimp.com/developer/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

*이 가이드는 KPOP Daily (https://kpop.andxo.com) 제작 경험을 바탕으로 작성되었습니다.*
*마지막 업데이트: 2026-01-10*
