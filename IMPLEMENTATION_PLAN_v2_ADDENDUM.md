# IMPLEMENTATION_PLAN v2.0 보완사항
**2026-01-12 | Final Review Feedback**

---

## 1. Pinterest API 승인 리스크 대비

### 문제점
Pinterest API는 최근 신규 앱 승인 심사가 까다로워짐.
"개인 프로젝트"로는 `standard` 액세스를 잘 안 내줌.

### Plan A: Pinterest API 직접 사용
```
신청 → 승인 대기 (1-2주)
성공 시: post-to-pinterest.ts 사용
```

### Plan B: Buffer (2주 이상 지연 시)
```
Buffer Free 플랜:
- 3개 소셜 채널 연결
- 채널당 10개 예약 포스트
- 월 30개 포스팅 가능

설정:
1. buffer.com 가입
2. Pinterest 연결
3. Zapier 또는 IFTTT로 자동화:
   - 트리거: GitHub에 새 기사 커밋
   - 액션: Buffer에 포스트 추가
```

### Plan C: Tailwind App
```
Tailwind Starter ($19.99/월):
- Pinterest 최적화 전문
- 스마트 스케줄링
- 해시태그 추천

* 수익이 발생한 후 업그레이드 고려
```

### 코드 수정: `scripts/post-to-pinterest.ts`

```typescript
// Pinterest API 실패 시 Buffer 폴백
async function postToPinterest(article: ArticleData) {
  try {
    // Plan A: 직접 API
    await postViaPinterestAPI(article);
  } catch (error) {
    if (isPinterestAPIError(error)) {
      console.log('Pinterest API failed, falling back to Buffer');
      // Plan B: Buffer 웹훅
      await postViaBufferWebhook(article);
    }
    throw error;
  }
}

async function postViaBufferWebhook(article: ArticleData) {
  // Buffer에 IFTTT/Zapier 웹훅 설정 후 사용
  const webhookUrl = process.env.BUFFER_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('Buffer webhook not configured');
    return;
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: article.title,
      description: article.excerpt,
      imageUrl: `https://kpop.andxo.com${article.thumbnail}`,
      link: `https://kpop.andxo.com/article/${article.slug}`,
    }),
  });
}
```

---

## 2. Supabase 비용 관리 (Realtime 비활성화)

### 문제점
```
supabase-js 기본 설정 → WebSocket 연결 (Realtime)
동시 접속 200명 초과 → 무료 티어 한도 초과
```

### 해결책
뉴스 댓글은 채팅이 아님 → **Realtime 불필요**

### 코드 수정: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Realtime 비활성화
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 0, // Realtime 이벤트 비활성화
    },
  },
  global: {
    headers: {
      'x-disable-realtime': 'true',
    },
  },
});

// 또는 더 명시적으로:
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  // Realtime 채널 사용 안 함
});
```

### Comments.tsx 수정

```typescript
// ❌ 사용 금지 (Realtime)
useEffect(() => {
  const subscription = supabase
    .channel('comments')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' },
      payload => { /* 실시간 업데이트 */ })
    .subscribe();
  return () => subscription.unsubscribe();
}, []);

// ✅ 권장 (REST API)
async function loadComments() {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('article_slug', articleSlug)
    .order('created_at', { ascending: true });

  if (!error) setComments(data);
}

// 새 댓글 작성 후 리로드
async function submitComment() {
  await supabase.from('comments').insert({ ... });
  await loadComments(); // 수동 새로고침
}
```

### 사용자 경험 개선

```typescript
// "새 댓글 확인" 버튼 추가
function Comments({ articleSlug }: CommentsProps) {
  const [hasNewComments, setHasNewComments] = useState(false);

  // 30초마다 새 댓글 확인 (Realtime 대체)
  useEffect(() => {
    const interval = setInterval(async () => {
      const { count } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('article_slug', articleSlug);

      if (count && count > comments.length) {
        setHasNewComments(true);
      }
    }, 30000); // 30초

    return () => clearInterval(interval);
  }, [comments.length]);

  return (
    <>
      {hasNewComments && (
        <button
          onClick={() => { loadComments(); setHasNewComments(false); }}
          className="w-full py-2 bg-pink-100 text-pink-600 rounded-lg mb-4"
        >
          New comments available - Click to refresh
        </button>
      )}
      {/* 댓글 목록 */}
    </>
  );
}
```

---

## 3. Editor's Take 페르소나 강화

### 문제점
```
❌ 딱딱한 AI 톤: "이것은 중요한 뉴스입니다."
→ 찐팬 같지 않아서 참여도 낮음
```

### 해결책: Stan Twitter 페르소나

### 프롬프트 수정: `scripts/fetch-news.ts`

```typescript
const EDITOR_PERSONA = `
You are "Mina", a 24-year-old K-Pop super fan and editor at KPOP Daily.

Your personality:
- You've been a K-Pop fan since 2015 (started with BTS)
- You use stan Twitter daily and know all the slang
- You're ENTHUSIASTIC but also analytical
- You genuinely care about the artists and fandoms
- You're not afraid to have opinions

Writing style for "Editor's Take" section:
- Start with an emotional reaction (excitement, nostalgia, surprise)
- Use emojis naturally but not excessively (2-4 per paragraph)
- Include stan Twitter language: "slay", "ate that", "we're so back",
  "crying in the club", "main character energy", "the way I screamed"
- Reference fandom inside jokes when relevant
- Ask engaging questions to readers
- Compare to past comebacks/events for context
- End with a call-to-action or prediction

Tone examples:
✅ "THE WAY I SCREAMED when I saw this news! 😭 After waiting 2 years for
   this comeback, we're finally getting fed. The teaser photos are giving
   major 'Whistle' era vibes and I'm NOT ready. What concept are you hoping for?"

❌ "This is exciting news for fans. The group will release new music soon.
   Fans are looking forward to it."

Remember: You're writing for fellow fans, not a formal news outlet.
`;

const CONTENT_PROMPT = `
${EDITOR_PERSONA}

Based on this news article:
{ORIGINAL_ARTICLE}

Write a blog post with:

1. **Summary** (2-3 paragraphs)
   - Neutral, factual news summary
   - Include key details (dates, names, quotes)

2. **💭 Mina's Take** (1-2 paragraphs)
   - YOUR personal reaction as a fan
   - Connect to K-Pop context (compare to other groups, past events)
   - Add fandom perspective
   - Ask an engaging question

3. **What Fans Are Saying** (optional)
   - Include 2-3 notable fan reactions if relevant
`;
```

### 예시 출력

```markdown
## Summary

NewJeans has officially announced their highly anticipated comeback,
scheduled for February 2026. The announcement came through their official
social media accounts, revealing a mysterious teaser image with the caption
"Something New is Coming."

According to ADOR, the group has been preparing this release for over
6 months, promising a fresh concept that will...

## 💭 Mina's Take

OKAY BUT THE WAY MY HEART STOPPED when I saw this on my timeline! 😭💖

After the incredible year they had with "Super Shy" and "ETA", I honestly
wasn't expecting another comeback so soon. But here we are, and the teaser
is giving me MAJOR "Attention" era vibes mixed with something completely new??

The styling in the photo is so different from their usual fresh concept -
we might be getting a more mature NewJeans and I'm absolutely here for it.
Also, did anyone notice the hidden message in the image? Bunnies are already
going full detective mode on Twitter lol 🔍

Real talk though - with aespa also coming back around the same time, we're
about to witness an EPIC chart battle. Who do you think will grab that #1 spot?
Drop your predictions below! 👇

## What Fans Are Saying

> "2 years of training for this comeback... you KNOW it's going to be legendary"
> — @bunny_forever

> "The budget for this era must be INSANE look at that set design"
> — @kpop_analyst
```

---

## 최종 체크리스트 (v2.0 + Addendum)

### Week 1-2

```
[ ] Pinterest API 신청
    → 2주 내 미승인 시 Buffer로 전환
[ ] Twitter API 설정
[ ] Editor's Take 프롬프트 (Mina 페르소나) 적용
[ ] 소셜 자동 포스팅 테스트
```

### Week 5-8

```
[ ] Supabase 댓글 (Realtime 비활성화!)
[ ] 30초 폴링으로 새 댓글 확인
[ ] 소셜 로그인 3종 테스트
```

---

*이 문서는 IMPLEMENTATION_PLAN_v2.md의 보완사항입니다.*
*작성일: 2026-01-12*
