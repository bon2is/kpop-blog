# KPOP Daily 6개월 완전 실행 계획서
**Version 2.0 | 2026-01-12 | Revised based on expert feedback**

---

## 주요 변경사항 (v1.0 → v2.0)

| 항목 | v1.0 | v2.0 | 이유 |
|------|------|------|------|
| 댓글 시스템 | Giscus (GitHub) | **Supabase + 소셜 로그인** | K-Pop 팬은 개발자가 아님 |
| 소셜 미디어 시작 | Month 2-3 | **Week 1-2** | SEO 전에 트래픽 필요 |
| Pinterest | 미포함 | **Phase 1에 추가** | 이미지 중심 K-Pop에 필수 |
| 다국어 번역 | 전체 번역 | **인기 글만 번역** | 비용 최적화 |
| AI 콘텐츠 | 요약만 | **Editor's Take 추가** | AdSense 승인 대비 |
| 트래픽 목표 | 200만 PV | **100만 PV (현실적)** | 오가닉 성장 한계 반영 |

---

## 개요

| 항목 | 내용 |
|------|------|
| **사이트** | https://kpop.andxo.com |
| **기술 스택** | Next.js 14, Vercel, OpenAI, **Supabase**, Mailchimp, GA4 |
| **기간** | 2026년 1월 ~ 6월 (6개월) |
| **브랜치** | `socialgrowup` |

### 수정된 목표 (현실적)

| 지표 | 현재 | 6개월 후 | 비고 |
|------|------|----------|------|
| 월간 PV | 0 | **1,000,000** | 오가닉 성장 한계 반영 |
| 이메일 구독자 | 0 | 30,000 | |
| TikTok 팔로워 | 0 | 50,000 | |
| Instagram 팔로워 | 0 | 30,000 | |
| **Pinterest** | 0 | **100,000** | 신규 추가 |
| 월 수익 | $0 | $3,000 | |

---

## 수정된 타임라인

| 주차 | Phase | 핵심 작업 | 우선순위 |
|------|-------|----------|----------|
| **1-2** | Infra + **Social** | SEO 기초 + **X/Pinterest 자동화** | 🔴 최우선 |
| **3-4** | Content | RSS 확장, 트렌딩, 아티스트 페이지 | 🟡 높음 |
| **5-8** | Community | **Supabase 댓글**, 투표, 뉴스레터 | 🟡 높음 |
| **9-12** | Video/Global | 틱톡 슬라이드 + **인기 글 번역** | 🟢 중간 |
| **13+** | Monetization | AdSense, 제휴 마케팅 | 🟢 중간 |

---

# Phase 1: 인프라 + 소셜 (Week 1-2)

## 1.1 SEO 기초 (기존 유지)

- JSON-LD 구조화 데이터
- RSS 피드 (content:encoded 포함)
- robots.txt / sitemap.xml
- Core Web Vitals 최적화

## 1.2 Editor's Take 섹션 (AdSense 대비)

### AI 프롬프트 수정: `scripts/fetch-news.ts`

```typescript
const CONTENT_PROMPT = `
You are a K-Pop news editor writing for global fans.

Create an article with these sections:
1. **Summary** (2-3 paragraphs): Neutral news summary
2. **Editor's Take** (1-2 paragraphs): YOUR personal opinion/analysis
   - Start with "💭 Editor's Take:"
   - Be opinionated (excited, analytical, or thoughtful)
   - Connect to broader K-Pop context
   - Ask engaging questions to readers

3. **Fan Reactions** (optional): Include notable fan comments if relevant

This structure ensures ORIGINAL COMMENTARY for AdSense compliance.
`;
```

### 마크다운 템플릿

```markdown
---
title: "NewJeans Announces Surprise Comeback"
category: Music
editorTake: true
---

## Summary
[AI-generated news summary]

## 💭 Editor's Take

As a K-Pop observer, I find this timing *fascinating*. Coming right after
aespa's album release, NewJeans is clearly positioning themselves for
a direct chart battle.

What do you think - can they top "Super Shy" with this comeback?
Drop your predictions in the comments!

## What Fans Are Saying
[Curated fan reactions from Twitter/Weverse]
```

---

## 1.3 Pinterest 자동화 (신규)

### 왜 Pinterest인가?

| 플랫폼 | K-Pop 적합성 | 트래픽 잠재력 | 자동화 난이도 |
|--------|-------------|--------------|--------------|
| Pinterest | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Twitter/X | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| Instagram | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ (API 제한) |
| TikTok | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ (수동 필요) |

### Pinterest 계정 설정

```
Business Account: kpopdaily
Boards:
  - K-Pop News (메인)
  - BTS Updates
  - BLACKPINK Updates
  - NewJeans Updates
  - K-Drama News
  - K-Pop Fashion
  - K-Pop Memes
```

### 파일 생성: `scripts/post-to-pinterest.ts`

```typescript
import 'dotenv/config';

interface PinData {
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  boardId: string;
}

// Pinterest API v5
async function createPin(pin: PinData) {
  const response = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PINTEREST_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: pin.boardId,
      media_source: {
        source_type: 'image_url',
        url: pin.imageUrl,
      },
      title: pin.title.slice(0, 100), // Pinterest 제한
      description: pin.description.slice(0, 500),
      link: pin.link,
      alt_text: pin.title,
    }),
  });

  if (!response.ok) {
    throw new Error(`Pinterest API error: ${response.status}`);
  }

  return response.json();
}

// 보드 ID 매핑
const BOARDS: Record<string, string> = {
  news: 'YOUR_NEWS_BOARD_ID',
  music: 'YOUR_MUSIC_BOARD_ID',
  drama: 'YOUR_DRAMA_BOARD_ID',
  celebrity: 'YOUR_CELEBRITY_BOARD_ID',
  fashion: 'YOUR_FASHION_BOARD_ID',
};

// 아티스트별 보드
const ARTIST_BOARDS: Record<string, string> = {
  bts: 'YOUR_BTS_BOARD_ID',
  blackpink: 'YOUR_BLACKPINK_BOARD_ID',
  newjeans: 'YOUR_NEWJEANS_BOARD_ID',
};

function detectArtist(title: string): string | null {
  const artists = Object.keys(ARTIST_BOARDS);
  const titleLower = title.toLowerCase();
  return artists.find(a => titleLower.includes(a)) || null;
}

export async function postArticleToPinterest(article: {
  title: string;
  excerpt: string;
  slug: string;
  thumbnail: string;
  category: string;
}) {
  const url = `https://kpop.andxo.com/article/${article.slug}`;
  const imageUrl = `https://kpop.andxo.com${article.thumbnail}`;

  // 해시태그 생성
  const hashtags = [
    '#kpop', '#kpopnews', '#kdrama', '#koreanpop',
    `#${article.category.toLowerCase()}`,
  ].join(' ');

  const description = `${article.excerpt}\n\n${hashtags}\n\nRead more at KPOP Daily`;

  // 카테고리 보드에 포스팅
  const categoryBoard = BOARDS[article.category.toLowerCase()] || BOARDS.news;
  await createPin({
    title: article.title,
    description,
    imageUrl,
    link: url,
    boardId: categoryBoard,
  });

  // 아티스트 보드에도 포스팅 (해당되는 경우)
  const artist = detectArtist(article.title);
  if (artist && ARTIST_BOARDS[artist]) {
    await createPin({
      title: article.title,
      description,
      imageUrl,
      link: url,
      boardId: ARTIST_BOARDS[artist],
    });
  }

  console.log(`Posted to Pinterest: ${article.title}`);
}
```

### Pinterest API 설정

1. https://developers.pinterest.com 에서 앱 생성
2. OAuth 2.0 설정
3. 필요 권한: `boards:read`, `pins:read`, `pins:write`
4. Access Token 발급 후 GitHub Secrets에 추가

---

## 1.4 Twitter/X 자동화

### 파일 생성: `scripts/post-to-twitter.ts`

```typescript
import 'dotenv/config';
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!,
});

// 아티스트별 해시태그
const ARTIST_HASHTAGS: Record<string, string[]> = {
  bts: ['#BTS', '#방탄소년단', '#ARMY'],
  blackpink: ['#BLACKPINK', '#블랙핑크', '#BLINK'],
  newjeans: ['#NewJeans', '#뉴진스', '#Bunnies'],
  aespa: ['#aespa', '#에스파', '#MY'],
  twice: ['#TWICE', '#트와이스', '#ONCE'],
  // ... 더 추가
};

function generateHashtags(title: string, category: string): string[] {
  const base = ['#KPOP', '#KPOPNews'];

  // 카테고리 해시태그
  const categoryTags: Record<string, string[]> = {
    music: ['#KPOPMusic', '#Comeback'],
    drama: ['#KDrama', '#KoreanDrama'],
    celebrity: ['#KPOPIdol'],
    variety: ['#KoreanVariety'],
  };
  base.push(...(categoryTags[category.toLowerCase()] || []));

  // 아티스트 해시태그 감지
  const titleLower = title.toLowerCase();
  Object.entries(ARTIST_HASHTAGS).forEach(([artist, tags]) => {
    if (titleLower.includes(artist)) {
      base.push(...tags);
    }
  });

  return [...new Set(base)].slice(0, 5); // 최대 5개
}

export async function postArticleToTwitter(article: {
  title: string;
  excerpt: string;
  slug: string;
  thumbnail: string;
  category: string;
}) {
  const url = `https://kpop.andxo.com/article/${article.slug}`;
  const hashtags = generateHashtags(article.title, article.category);

  // 트윗 길이 제한 (280자) 고려
  const maxExcerptLength = 200 - hashtags.join(' ').length - url.length - 10;
  const excerpt = article.excerpt.length > maxExcerptLength
    ? article.excerpt.slice(0, maxExcerptLength) + '...'
    : article.excerpt;

  const tweetText = `${article.title}\n\n${excerpt}\n\n${hashtags.join(' ')}\n\n${url}`;

  try {
    // 이미지 업로드 (선택)
    // const mediaId = await client.v1.uploadMedia(article.thumbnail);

    const result = await client.v2.tweet(tweetText);
    console.log(`Posted to Twitter: ${result.data.id}`);
    return result;
  } catch (error) {
    console.error('Twitter post failed:', error);
    throw error;
  }
}
```

### 의존성 설치

```bash
npm install twitter-api-v2
```

---

## 1.5 GitHub Actions: 소셜 자동 포스팅

### 파일 생성: `.github/workflows/social-post.yml`

```yaml
name: Post to Social Media

on:
  push:
    paths:
      - 'content/posts/*.md'
  workflow_dispatch:
    inputs:
      slug:
        description: 'Article slug to post (leave empty for latest)'
        required: false

jobs:
  post-to-social:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Get new articles
        id: articles
        run: |
          if [ -n "${{ github.event.inputs.slug }}" ]; then
            echo "slugs=${{ github.event.inputs.slug }}" >> $GITHUB_OUTPUT
          else
            # 최근 커밋에서 추가된 기사 찾기
            NEW_FILES=$(git diff --name-only HEAD~1 HEAD -- 'content/posts/*.md' | head -5)
            SLUGS=$(echo "$NEW_FILES" | xargs -I {} basename {} .md | tr '\n' ' ')
            echo "slugs=$SLUGS" >> $GITHUB_OUTPUT
          fi

      - name: Post to Pinterest & Twitter
        if: steps.articles.outputs.slugs != ''
        env:
          PINTEREST_ACCESS_TOKEN: ${{ secrets.PINTEREST_ACCESS_TOKEN }}
          TWITTER_API_KEY: ${{ secrets.TWITTER_API_KEY }}
          TWITTER_API_SECRET: ${{ secrets.TWITTER_API_SECRET }}
          TWITTER_ACCESS_TOKEN: ${{ secrets.TWITTER_ACCESS_TOKEN }}
          TWITTER_ACCESS_SECRET: ${{ secrets.TWITTER_ACCESS_SECRET }}
        run: |
          for slug in ${{ steps.articles.outputs.slugs }}; do
            echo "Posting: $slug"
            npx ts-node scripts/post-social.ts "$slug"
            sleep 5  # Rate limiting
          done

      - name: Summary
        if: always()
        run: |
          echo "## Social Media Posting" >> $GITHUB_STEP_SUMMARY
          echo "Posted articles: ${{ steps.articles.outputs.slugs }}" >> $GITHUB_STEP_SUMMARY
```

### 파일 생성: `scripts/post-social.ts`

```typescript
import { postArticleToPinterest } from './post-to-pinterest';
import { postArticleToTwitter } from './post-to-twitter';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: ts-node post-social.ts <slug>');
    process.exit(1);
  }

  const filePath = path.join(process.cwd(), 'content/posts', `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    console.error(`Article not found: ${slug}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { data } = matter(content);

  const article = {
    title: data.title,
    excerpt: data.excerpt,
    slug,
    thumbnail: data.thumbnail,
    category: data.category,
  };

  console.log(`Posting: ${article.title}`);

  // Pinterest 먼저 (이미지 중심)
  try {
    await postArticleToPinterest(article);
    console.log('✅ Pinterest posted');
  } catch (error) {
    console.error('❌ Pinterest failed:', error);
  }

  // Twitter
  try {
    await postArticleToTwitter(article);
    console.log('✅ Twitter posted');
  } catch (error) {
    console.error('❌ Twitter failed:', error);
  }
}

main().catch(console.error);
```

---

## Phase 1 체크리스트 (수정됨)

```
[ ] JSON-LD 구조화 데이터
[ ] RSS 피드 (content:encoded 포함)
[ ] Editor's Take 프롬프트 수정
[ ] Pinterest Business 계정 생성
[ ] Pinterest API 앱 생성 및 토큰 발급
[ ] Twitter Developer 계정 및 API 키 발급
[ ] post-to-pinterest.ts 생성
[ ] post-to-twitter.ts 생성
[ ] social-post.yml 워크플로우 생성
[ ] GitHub Secrets 설정:
    - PINTEREST_ACCESS_TOKEN
    - TWITTER_API_KEY
    - TWITTER_API_SECRET
    - TWITTER_ACCESS_TOKEN
    - TWITTER_ACCESS_SECRET
```

### 성공 기준 (Week 2)
- [ ] 매 기사 발행 시 Pinterest/Twitter 자동 포스팅
- [ ] Pinterest: 100+ 핀, 500+ 노출
- [ ] Twitter: 50+ 팔로워, 100+ 인게이지먼트

---

# Phase 2: 커뮤니티 - Supabase 댓글 (Week 5-8)

## 2.1 왜 Supabase인가?

| 솔루션 | 소셜 로그인 | 비용 | 커스터마이징 | K-Pop 팬 적합성 |
|--------|------------|------|-------------|----------------|
| Giscus | ❌ GitHub만 | 무료 | 낮음 | ❌ 개발자 전용 |
| Disqus | ✅ | 무료(광고) | 낮음 | ⚠️ 광고 지저분 |
| **Supabase** | ✅ Google/Twitter/Kakao | **무료** | **높음** | ✅ 완벽 |
| 자체 구축 | ✅ | 서버 비용 | 최고 | ✅ |

### Supabase 무료 티어
- 500MB 데이터베이스
- 50,000 월간 활성 사용자
- 무제한 API 요청
- **충분합니다!**

---

## 2.2 Supabase 설정

### 1. 프로젝트 생성
1. https://supabase.com 가입
2. New Project 생성 (Region: Northeast Asia - Tokyo)
3. Project URL과 anon key 복사

### 2. 테이블 생성

```sql
-- 댓글 테이블
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_slug TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE -- 대댓글용
);

-- 인덱스
CREATE INDEX idx_comments_article ON comments(article_slug, created_at DESC);
CREATE INDEX idx_comments_user ON comments(user_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 읽기: 누구나 (삭제되지 않은 댓글)
CREATE POLICY "Anyone can read comments"
  ON comments FOR SELECT
  USING (is_deleted = FALSE);

-- 쓰기: 로그인 사용자만
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 수정: 본인 댓글만
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

-- 삭제: 본인 댓글만 (soft delete)
CREATE POLICY "Users can delete own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (is_deleted = TRUE);
```

### 3. 소셜 로그인 설정 (Supabase Dashboard)

**Authentication > Providers:**

| Provider | 설정 |
|----------|------|
| Google | OAuth Client ID/Secret 입력 |
| Twitter | API Key/Secret 입력 |
| Kakao | REST API Key 입력 (한국 팬용) |

---

## 2.3 Supabase 클라이언트 설정

### 의존성 설치

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 파일 생성: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Comment = {
  id: string;
  article_slug: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  created_at: string;
  parent_id: string | null;
  replies?: Comment[];
};
```

### 환경 변수: `.env.local`

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 2.4 댓글 컴포넌트

### 파일 생성: `src/components/Comments.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { supabase, Comment } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { MessageCircle, Send, LogIn, Trash2, Reply } from 'lucide-react';
import Image from 'next/image';

interface CommentsProps {
  articleSlug: string;
}

export default function Comments({ articleSlug }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 사용자 세션 확인
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // 댓글 로드
  useEffect(() => {
    loadComments();
  }, [articleSlug]);

  async function loadComments() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('article_slug', articleSlug)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // 대댓글 구조화
      const rootComments = data.filter(c => !c.parent_id);
      const replies = data.filter(c => c.parent_id);

      rootComments.forEach(comment => {
        comment.replies = replies.filter(r => r.parent_id === comment.id);
      });

      setComments(rootComments);
    }
    setIsLoading(false);
  }

  // 소셜 로그인
  async function signInWith(provider: 'google' | 'twitter' | 'kakao') {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/article/${articleSlug}`,
      },
    });
  }

  // 댓글 작성
  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    const { error } = await supabase.from('comments').insert({
      article_slug: articleSlug,
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
      user_avatar: user.user_metadata?.avatar_url,
      content: newComment.trim(),
      parent_id: replyTo,
    });

    if (!error) {
      setNewComment('');
      setReplyTo(null);
      loadComments();
    }
  }

  // 댓글 삭제
  async function deleteComment(id: string) {
    if (!confirm('Delete this comment?')) return;

    await supabase
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', id);

    loadComments();
  }

  // 로그아웃
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-pink-500" />
          <h2 className="text-2xl font-bold text-gray-900">
            Comments ({comments.length})
          </h2>
        </div>

        {user && (
          <button
            onClick={signOut}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        )}
      </div>

      {/* 로그인 버튼 */}
      {!user && (
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 mb-6">
          <p className="text-gray-700 mb-4">Sign in to join the conversation</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => signInWith('google')}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <Image src="/icons/google.svg" alt="Google" width={20} height={20} />
              <span>Google</span>
            </button>
            <button
              onClick={() => signInWith('twitter')}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <Image src="/icons/twitter.svg" alt="Twitter" width={20} height={20} />
              <span>Twitter</span>
            </button>
            <button
              onClick={() => signInWith('kakao')}
              className="flex items-center gap-2 px-4 py-2 bg-[#FEE500] rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <Image src="/icons/kakao.svg" alt="Kakao" width={20} height={20} />
              <span>Kakao</span>
            </button>
          </div>
        </div>
      )}

      {/* 댓글 입력 */}
      {user && (
        <form onSubmit={submitComment} className="mb-8">
          <div className="flex gap-3">
            {user.user_metadata?.avatar_url && (
              <Image
                src={user.user_metadata.avatar_url}
                alt="Avatar"
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
            <div className="flex-1">
              {replyTo && (
                <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                  <Reply className="w-4 h-4" />
                  <span>Replying to comment</span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-pink-500 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts..."
                  maxLength={1000}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* 댓글 목록 */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No comments yet. Be the first to share your thoughts!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              onReply={() => setReplyTo(comment.id)}
              onDelete={() => deleteComment(comment.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// 개별 댓글 카드
function CommentCard({
  comment,
  currentUserId,
  onReply,
  onDelete,
}: {
  comment: Comment;
  currentUserId?: string;
  onReply: () => void;
  onDelete: () => void;
}) {
  const isOwner = currentUserId === comment.user_id;
  const timeAgo = formatTimeAgo(new Date(comment.created_at));

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex gap-3">
        {comment.user_avatar ? (
          <Image
            src={comment.user_avatar}
            alt={comment.user_name}
            width={36}
            height={36}
            className="rounded-full"
          />
        ) : (
          <div className="w-9 h-9 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
            {comment.user_name[0].toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{comment.user_name}</span>
            <span className="text-sm text-gray-400">{timeAgo}</span>
          </div>
          <p className="text-gray-700">{comment.content}</p>

          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={onReply}
              className="text-sm text-gray-500 hover:text-pink-500 flex items-center gap-1"
            >
              <Reply className="w-4 h-4" />
              Reply
            </button>
            {isOwner && (
              <button
                onClick={onDelete}
                className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>

          {/* 대댓글 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-3">
              {comment.replies.map(reply => (
                <div key={reply.id} className="text-sm">
                  <span className="font-medium text-gray-900">{reply.user_name}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-400">{formatTimeAgo(new Date(reply.created_at))}</span>
                  <p className="text-gray-700 mt-1">{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 시간 포맷
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}
```

---

## Phase 2 (Community) 체크리스트

```
[ ] Supabase 프로젝트 생성
[ ] comments 테이블 생성
[ ] RLS 정책 설정
[ ] Google OAuth 설정
[ ] Twitter OAuth 설정
[ ] Kakao OAuth 설정
[ ] @supabase/supabase-js 설치
[ ] supabase.ts 클라이언트 설정
[ ] Comments.tsx 생성
[ ] 기사 페이지에 Comments 추가
[ ] 소셜 로그인 아이콘 추가 (public/icons/)
[ ] 환경 변수 설정 (.env.local, Vercel)
```

### 성공 기준
- [ ] Google/Twitter/Kakao 로그인 동작
- [ ] 댓글 작성/삭제/대댓글 동작
- [ ] 평균 기사당 5+ 댓글

---

# Phase 3: TikTok 슬라이드쇼 (Week 9-12)

## 3.1 왜 슬라이드쇼인가?

| 형식 | 제작 난이도 | 알고리즘 성과 | 자동화 가능성 |
|------|------------|--------------|--------------|
| FFmpeg 영상 | 높음 | 낮음 | 중간 |
| **이미지 슬라이드** | **낮음** | **높음** | **높음** |
| 실제 촬영 | 매우 높음 | 높음 | 불가능 |

**TikTok/Instagram Reels 알고리즘은 사진 슬라이드쇼를 일반 영상과 동일하게 취급합니다.**

---

## 3.2 슬라이드쇼용 이미지 생성

### AI 프롬프트 수정 (5장 생성)

```typescript
// scripts/generate-slides.ts
async function generateSlideImages(article: {
  title: string;
  keyPoints: string[]; // 5개 핵심 포인트
}) {
  const slides: string[] = [];

  // 슬라이드 1: 타이틀
  const titlePrompt = `
    K-Pop news title card, Studio Ghibli anime style,
    Text area for "${article.title}",
    Soft pastel colors, clean design,
    16:9 aspect ratio
  `;

  // 슬라이드 2-4: 핵심 내용
  for (const point of article.keyPoints.slice(0, 3)) {
    const contentPrompt = `
      K-Pop illustration, Studio Ghibli anime style,
      Visual representation of: ${point},
      Soft lighting, dreamy atmosphere,
      16:9 aspect ratio
    `;
    // DALL-E 호출
  }

  // 슬라이드 5: CTA
  const ctaPrompt = `
    Call to action card, Studio Ghibli anime style,
    "Follow for more K-Pop news" theme,
    Soft pastel colors, inviting design,
    16:9 aspect ratio
  `;

  return slides;
}
```

### 수동 업로드 가이드

TikTok API는 직접 포스팅이 제한적이므로:

1. 슬라이드 이미지 5장 자동 생성
2. `/public/slides/{slug}/` 폴더에 저장
3. **수동으로** TikTok/Instagram에 슬라이드쇼로 업로드
4. 캡션 템플릿 자동 생성

### 캡션 템플릿 생성

```typescript
function generateTikTokCaption(article: {
  title: string;
  excerpt: string;
}) {
  const hashtags = [
    '#kpop', '#kpopnews', '#kdrama', '#fyp', '#foryou',
    '#kpopfyp', '#koreanpop', '#kpoptiktok'
  ].join(' ');

  return `
${article.title} 📰

${article.excerpt.slice(0, 100)}...

🔗 Full story: kpop.andxo.com (link in bio)

${hashtags}
  `.trim();
}
```

---

# Phase 4: 인기 글 번역 (Month 3+)

## 4.1 번역 비용 최적화

### 기존 계획 (비용 폭발)
- 모든 기사 × 6개 언어 = **30개 번역/일**
- GPT-4o-mini: ~$0.01/번역 × 30 × 30일 = **$9/월**

### 수정된 계획 (비용 최적화)
- **조회수 상위 20% 기사만** 번역
- 5개 기사/일 × 상위 1개만 = **1개 번역/일**
- **$0.30/월**

---

## 4.2 인기 글 감지 자동화

### 파일 생성: `scripts/translate-popular.ts`

```typescript
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const analyticsDataClient = new BetaAnalyticsDataClient();

async function getPopularArticles(days: number = 7): Promise<string[]> {
  const [response] = await analyticsDataClient.runReport({
    property: `properties/${process.env.GA4_PROPERTY_ID}`,
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 10,
  });

  const slugs: string[] = [];
  for (const row of response.rows || []) {
    const path = row.dimensionValues?.[0]?.value;
    if (path?.startsWith('/article/')) {
      slugs.push(path.replace('/article/', '').replace('/', ''));
    }
  }

  return slugs;
}

async function translatePopularArticles() {
  const popularSlugs = await getPopularArticles(7);

  // 상위 5개만 번역
  for (const slug of popularSlugs.slice(0, 5)) {
    // 이미 번역된 기사 스킵
    if (await isAlreadyTranslated(slug)) continue;

    // 번역 실행
    await translateArticle(slug, ['ko', 'ja', 'es']);
  }
}
```

---

# 최종 체크리스트

## Week 1-2: 인프라 + 소셜

```
[ ] SEO 기초 완료
[ ] Editor's Take 프롬프트 수정
[ ] Pinterest 계정 + API 설정
[ ] Twitter API 설정
[ ] 자동 포스팅 워크플로우 동작
```

## Week 3-4: 콘텐츠

```
[ ] RSS 소스 확장
[ ] 트렌딩 토픽 표시
[ ] 아티스트 페이지 완성
[ ] 검색 기능 동작
```

## Week 5-8: 커뮤니티

```
[ ] Supabase 댓글 시스템 완성
[ ] 소셜 로그인 3종 동작 (Google/Twitter/Kakao)
[ ] 투표 시스템
[ ] 뉴스레터 세분화
```

## Week 9-12: 확장

```
[ ] TikTok 슬라이드 템플릿
[ ] 인기 글 번역 자동화
[ ] AdSense 신청
```

---

# 리스크 매트릭스 (수정됨)

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| Pinterest API 거부 | 낮음 | 중간 | Tailwind/Buffer 사용 |
| Twitter API 제한 | 중간 | 중간 | 수동 포스팅 백업 |
| Supabase 무료 한도 | 낮음 | 낮음 | Pro 업그레이드 ($25/월) |
| AdSense 거부 | 중간 | 중간 | Editor's Take로 대응 |
| 번역 비용 초과 | 낮음 | 낮음 | 인기 글만 번역 |

---

*문서 버전: 2.0*
*작성일: 2026-01-12*
*리뷰어 피드백 반영: Giscus→Supabase, 소셜 우선, Pinterest 추가*
