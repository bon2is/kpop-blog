# kpop.andxo.com 광고 인프라 감사 (Phase 1, Read-Only)

> **작성일:** 2026-06-01
> **저장소:** `/Users/bon2/vibeprj/kpop` (수정 없음, audit only)
> **비교 대상:** `/Users/bon2/vibeprj/silverdrive` — silverdrive.andxo.com 실제 배포 코드 (git remote: `bon2is/silverdrive`, 최근 commit `7be7608` GA4 SPA tracking — 운영 상태와 일치)
> **참고하지 않은 코드:** `silverdrive2`, `silverdrive2_backup(beforeCodex)_20260601` (다른 BM 프로젝트, 배포 도메인 불일치)

---

## 1. kpop.andxo.com 현재 광고 상태

### 1.1 AdSense 식별자 & 스크립트 로딩

| 항목 | 값 | 위치 |
| --- | --- | --- |
| Publisher (AdSense client) | `ca-pub-7999144867236526` (하드코딩) | `src/components/AdBanner.tsx:6`, `src/components/AdSenseScript.tsx:3`, `src/app/layout.tsx:96` |
| AdSense 사이트 확인 meta | `<meta name="google-adsense-account" content="ca-pub-7999144867236526" />` | `src/app/layout.tsx:96` |
| adsbygoogle.js 로더 | `<Script async strategy="afterInteractive">` | `src/components/AdSenseScript.tsx:9-16` |
| **로딩 스코프** | **전 사이트 (RootLayout `<body>` 직속)** | `src/app/layout.tsx:130` |
| Auto Ads (`enable_page_level_ads`) | 미설정 (Manual 모드 선언) | 코드 주석 `AdSenseScript.tsx:5-7` |
| GA4 | `G-YQYVZJ28RZ` (하드코딩, head에 inline) | `src/app/layout.tsx:106-120` |

> 코드는 Auto Ads OFF를 의도하고 있으나, AdSense 대시보드에서 Auto Ads가 켜져 있으면 충돌 가능. **대시보드 상태 확인 필요 — Phase 2 진입 전 운영자 손으로 검증.**

### 1.2 ad slot 정의

`src/components/AdBanner.tsx:8-15`:

```ts
const AD_SLOTS = {
  display:      '7671594779',  // andxo-display-300x250 (BottomBanner와 동일 ID)
  topBanner:    '4092888672',  // 상단 배너
  bottomBanner: '7671594779',  // display 슬롯과 동일
  inArticle:    '4326293473',  // in-article (네이티브)
  inFeed:       '5270444172',  // in-feed (네이티브)
  sidebar:      '1112352179',  // 300×600 vertical
};
```

> ⚠ `display`와 `bottomBanner`는 같은 slot ID. 한 페이지에서 동일 slot이 2회 이상 push될 가능성 있음 (article 페이지에서 `<AdBanner>` 기본값 = display, `<BottomBannerAd>` = bottomBanner → 같은 ID). AdSense는 같은 slot의 중복 호출을 fill 안 함 → **무효 호출이 fill rate를 직접 깎는다.**

### 1.3 컴포넌트 동작

`src/components/AdBanner.tsx`:

- `'use client'` — 모두 클라이언트 렌더
- `usePathname()` + `useRef`로 SPA 라우트 변경 시 `push({})` 재호출 (정상)
- **개발 환경 분기 없음**: `process.env.NODE_ENV === 'production'` 체크는 `AdPlaceholder`에만 있음. 정작 `<AdBanner>`, `<InArticleAd>`, `<InFeedAd>`, `<TopBannerAd>`, `<BottomBannerAd>`, `<SidebarAd>`는 **개발 환경에서도 그대로 `<ins>` 렌더 + push** → 로컬/PR Preview에서 AdSense 정책 위반 호출 위험
- **에러 바운더리 없음** — 광고 실패 시 빈 div만 남음
- min-height: 일반 banner는 `90px`만 명시, InArticleAd는 명시 없음 (`textAlign:center`만), InFeedAd는 명시 없음 → **광고가 늦게 load되면 fluid 포맷의 경우 reflow → 모바일에서 CLS 발생 가능**
- 모바일/데스크톱 분기 없음 (SidebarAd만 부모 페이지에서 `hidden xl:block`)
- 광고 차단 우회 코드 / 정책 위반 코드 없음 (push try-catch 정상)

### 1.4 페이지별 슬롯 배치 매핑

| 페이지 | 파일 | 슬롯 | 위치 (ATF 여부) |
| --- | --- | --- | --- |
| `/` (홈) | `src/app/page.tsx:106` | `<AdBanner>` (display) | Hero 아래 — 모바일에서 fold 밑 |
| `/` (홈) | `src/app/page.tsx:187` | `<InFeedAd>` | Latest News 2개 카드 뒤 |
| `/` (홈) | `src/app/page.tsx:196` | `<AdBanner>` (display) | Latest News 섹션 끝 |
| `/` (홈) | `src/app/page.tsx:212` | `<InFeedAd>` | More Stories 중간 |
| `/` (홈) | `src/app/page.tsx:248` | `<SidebarAd>` (300×600 sticky) | XL 뷰포트만 |
| `/article/[slug]` | `src/app/article/[slug]/page.tsx:220` | `<TopBannerAd>` | 헤더+제목+excerpt+메타 뒤, **featured image 위** — 모바일 fold 거의 밖 |
| `/article/[slug]` | `src/app/article/[slug]/page.tsx:251` | `<InArticleAd>` × 최대 3개 | H2 섹션 사이 (`contentSections.length < 4`이면 1~2개만 발생) |
| `/article/[slug]` | `src/app/article/[slug]/page.tsx:384` | `<SidebarAd>` | XL 뷰포트만 |
| `/article/[slug]` | `src/app/article/[slug]/page.tsx:405` | `<BottomBannerAd>` | **`relatedArticles.length > 0` 조건 — 관련 글 없으면 광고도 없음** |
| `/category/[slug]` | `src/app/category/[slug]/page.tsx:104, 151, 156` | `<AdBanner>` × 2 + `<SidebarAd>` | 상단/하단/사이드 |
| `/tag/[slug]` | `src/app/tag/[slug]/page.tsx:178, 201` | `<AdBanner>` × 2 | 상단/하단 |
| `/articles` | `src/app/articles/page.tsx:55, 61` | `<AdBanner>` × 2 | 상단/하단 |
| 카테고리/태그/아티스트 목록 | `CategoryArticleList`, `ArticlesBrowser`, `ArtistArticleList`, `TagArticleList` | `<InFeedAd>` (페이지네이션 사이) | 페이지 내 |

**article 페이지 ASCII 도식 (모바일 ≈ 412px wide 가정):**

```
┌─ Reading Progress Bar
┌─ Breadcrumb
┌─ Category badge
┌─ Title (3xl)
┌─ Excerpt (xl)
┌─ Meta row (date, reading time, ViewCounter, author)
├─ TopBannerAd            ← 의도된 ATF, 실제론 fold 직전/직후
┌─ Featured Image (aspect-video, maxHeight 60vh)
┌─ Section 1 (H2)
├─ InArticleAd #1
┌─ Section 2 (H2)
├─ InArticleAd #2
┌─ Section 3 (H2)
├─ InArticleAd #3
┌─ Source Attribution CTA (큰 pink box)
┌─ Tags
┌─ Featured Artist card
┌─ AuditionPromoCard (조건부)
┌─ Like/Bookmark/Share
┌─ CoupangBanner
┌─ DisqusComments (대형 iframe — LCP/INP에 큰 영향)
┌─ ArticleNavigation
┌─ Related Articles grid
└─ BottomBannerAd (조건부)
```

### 1.5 핵심 결함 요약

1. **fill rate ~5.6% 추정**: 1,425 PV × 평균 4 슬롯 = ~5,700 호출 기대치 vs 실제 노출 322 → 호출 자체가 적거나 fill이 되지 않음.
2. **slot ID 중복**: `display = bottomBanner` (`7671594779`) → 같은 페이지 2회 push → 무효 호출.
3. **ATF 슬롯 부재**: `TopBannerAd`가 ATF로 의도되었지만 헤더 + 제목 + excerpt + 메타데이터(약 200~280px) 뒤에 놓여 모바일 fold(≈812px) 안에 들어가더라도 광고 ins 자체의 lazy nature 때문에 viewport entry 시점에 빈 div → Active View 35%의 원인.
4. **개발 환경 정책 위험**: dev에서도 `<ins>` 호출 → Vercel Preview, 로컬 모두 AdSense에 무효 호출을 보낼 수 있음.
5. **AdSenseScript 글로벌 로드**: `/privacy`, `/terms`, `/about` 등 광고 없는 페이지에서도 adsbygoogle.js를 로드 → LCP 손해.
6. **CLS 가드 부족**: InArticleAd, InFeedAd에 min-height 미지정.
7. **에러 바운더리 없음**: 광고 push 실패 시 빈 공간만 남음.
8. **하단 광고가 조건부**: `relatedArticles.length > 0`일 때만 `<BottomBannerAd>` 렌더 — 짧은 글 / 카테고리 매칭 적은 글은 끝 광고 0개.
9. **InArticleAd 개수 변동**: `contentSections.length < 4`이면 InArticleAd가 1~2개 → "광고 4개"라는 의도가 단편 글에서 무너짐.
10. **Disqus iframe 위에 광고가 묻힘**: DisqusComments 위로 광고가 없고, 그 아래(`BottomBannerAd`)에 있어서 Disqus 로드 직후 광고가 가려질 가능성. Disqus 큰 iframe 자체가 LCP/INP를 깎고 있어 광고 viewability에 악영향.

---

## 2. silverdrive 골든 레시피 (벤치마크)

### 2.1 운영 코드 경로 식별

- **운영 코드:** `/Users/bon2/vibeprj/silverdrive/`
- git remote: `github.com/bon2is/silverdrive.git`
- 최근 commit: `7be7608 fix: Window.gtag 타입 선언 충돌 해소`, `aae5f8f feat: GA4 SPA 라우트 추적 + SEO 강화`
- silverdrive2, silverdrive2_backup은 별개의 "3년 패스 BM" 프로젝트로 silverdrive.andxo.com 운영 코드와 무관

### 2.2 광고 슬롯 개수·위치·크기

| 페이지 | 슬롯 | 포맷 | 위치 |
| --- | --- | --- | --- |
| `/result-loading` | `<AdBanner variant="rectangle">` × **1** | 300×250 고정 (Medium Rectangle) | **화면 중앙** — 스피너+분석 문구 아래, 카운트다운 위 |
| `/result` | `<AdBanner variant="banner">` × **1** | Responsive Banner | 페이지 맨 아래 |

**전체 사이트에서 광고 슬롯 = 단 2개. 다른 페이지(`/`, `/test`, `/share`, `/about` 등)에는 광고 0개.**

### 2.3 ATF 처리 — silverdrive의 비밀

- `/result-loading`은 **광고가 즉 ATF**다. 페이지 진입 즉시 화면 한가운데에 300×250 광고가 떠 있고, 사용자는 12초간 카운트다운을 보면서 광고를 강제로 응시한다.
- "75세 운전면허 갱신 적성검사" 키워드로 검색해 들어온 high-intent 시니어 사용자가 100% Active View로 쌓임 → 단가 자체가 일반 K-Pop 가십과 비교 불가.
- 즉 silverdrive의 RPM $21은 "슬롯 수"가 아니라 **컨텐츠 적합도 × 단가 높은 키워드 × ATF 강제 viewport × 단일 슬롯 집중**의 곱.

### 2.4 핵심 컴포넌트 코드 (인용)

`src/components/AdBanner.tsx:19-104` (요지):

```tsx
function AdUnit({ variant = "banner" }: AdUnitProps) {
  const pushed     = useRef(false);
  const native     = Capacitor.isNativePlatform();
  const isProd     = process.env.NODE_ENV === "production";
  const client     = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  const slotRect   = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECT?.trim();
  const slotBanner = process.env.NEXT_PUBLIC_ADSENSE_SLOT?.trim();

  const isRect = variant === "rectangle";
  const slot   = isRect ? (slotRect || slotBanner) : slotBanner;

  useEffect(() => {
    if (native || !client || !isProd || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn("[AdSense] push 실패:", e);
    }
  }, [native, client, isProd]);

  if (native) return null;

  // 개발 환경 or 클라이언트 ID 없으면 플레이스홀더
  if (!client || !isProd) {
    return (
      <div style={{ width: isRect ? "300px" : "100%",
                    height: isRect ? "250px" : "60px",
                    border: "2px dashed ...", ... }}>
        광고 영역 {isRect ? "(300×250)" : "(배너)"}
      </div>
    );
  }

  return (
    <>
      {/* 광고가 있는 페이지에서만 스크립트 로드 (Auto Ads 방지) */}
      <Script id="adsbygoogle-js"
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
              crossOrigin="anonymous"
              strategy="afterInteractive" />

      {isRect ? (
        <ins className="adsbygoogle"
             style={{ display: "inline-block", width: "300px", height: "250px" }}
             data-ad-client={client}
             data-ad-slot={slot} />
      ) : (
        <ins className="adsbygoogle"
             style={{ display: "block", minHeight: "60px" }}
             data-ad-client={client}
             data-ad-slot={slot}
             data-ad-format="auto"
             data-full-width-responsive="true" />
      )}
    </>
  );
}

export function AdBanner({ variant }: AdBannerProps) {
  return (
    <AdErrorBoundary fallback={<SafeDrivingCard />}>
      <AdUnit variant={variant} />
    </AdErrorBoundary>
  );
}
```

**참고할 패턴 (포팅 후보):**

| 패턴 | 효과 | kpop 적용 가능성 |
| --- | --- | --- |
| `process.env.NODE_ENV === "production"` 가드 | dev/Preview에서 ins 미렌더 → 무효 호출 0 | 즉시 도입 가능 |
| AdSense 스크립트를 광고 페이지에서만 lazy 로드 | 광고 없는 페이지 LCP 보호 | layout에서 빼고 AdBanner 내부로 이동 |
| `AdErrorBoundary` + 폴백 카드 | 광고 실패 시 빈 공간 대신 컨텐츠 카드 | kpop은 `AuditionPromoCard` 같은 fallback이 자연스러움 |
| Medium Rectangle 300×250 고정 사이즈 | CPC fill rate 최고 포맷, CLS 0 | ATF 슬롯에 도입 강력 추천 |
| `pushed` ref로 중복 push 방지 | invalid traffic 방지 | kpop도 이미 적용하나, useEffect dependency 처리 점검 필요 |
| 환경변수로 slot ID 관리 | 빌드 환경별 분리 가능 | kpop CLAUDE.md 정책상 하드코딩 권장 — 둘 다 가능 |

### 2.5 silverdrive에 없지만 kpop에 필요한 것

- 콘텐츠 페이지가 1,233개라 단일 슬롯 전략은 불가
- 대신 **"광고-친화 페이지 vs 일반 페이지" 분리**로 silverdrive 효과 재현 가능: 카테고리 audition / tour / concert / debut 페이지에 ATF 300×250 1개 고정 → 나머지 가십 페이지는 in-article 1~2개로 축소

---

## 3. 갭 분석

| 항목 | kpop 현재 | silverdrive | 격차 | 액션 우선순위 |
| --- | --- | --- | --- | --- |
| Page RPM | $0.08 | $21.00 | 262× | — |
| PV당 노출 | 0.23 | 4.01 | 17× | P0 |
| Active View | 35.81% | 91.08% | 2.5× | P0 |
| 노출 RPM | $0.34 | $5.24 | 15× | P1 |
| 슬롯 수 / 페이지 | 4~5개 | 1개 | 너무 많음(역설) | P0 |
| ATF 광고 강제 | 사실상 부재 | 화면 중앙 강제 | 결정적 차이 | P0 |
| dev/Preview 가드 | 없음 | 있음 | 정책 위험 | P0 |
| AdSense 스크립트 스코프 | 전 사이트 글로벌 | 광고 페이지만 | LCP 손해 | P1 |
| Error Boundary + fallback | 없음 | `AdErrorBoundary` + `SafeDrivingCard` | 빈 공간 발생 | P1 |
| 고정 사이즈 슬롯 (CLS 0) | 없음 | 300×250 고정 | CLS 위험 | P1 |
| slot ID 중복 | display=bottomBanner | 분리 | 무효 호출 | P0 |
| 콘텐츠 카테고리 적합도 | drama+news+celebrity 36% | 시니어 운전 100% | RPM 천장 | P2 (구조적) |

---

## 4. 콘텐츠 카테고리 분포 요약 (1,233 posts)

### 4.1 카테고리 분포

| 카테고리 | 글 수 | 비중 | 광고 단가 추정 |
| --- | --- | --- | --- |
| drama | 257 | 20.8% | 낮음 (가십성) |
| news | 110 | 8.9% | 낮음 |
| celebrity | 84 | 6.8% | 낮음 |
| **audition** | **83** | **6.7%** | **높음 (학원·아카데미 수직)** |
| award | 56 | 4.5% | 중 |
| comeback | 55 | 4.5% | 중 (음반·예약·굿즈) |
| tour | 54 | 4.4% | **높음 (티켓·여행·숙박)** |
| music | 35 | 2.8% | 중 |
| fashion | 22 | 1.8% | 중 (패션·뷰티) |
| variety | 4 | 0.3% | 낮음 |

### 4.2 고단가 키워드 태그 빈도 (중복 카운트)

| 태그 | 글 수 |
| --- | --- |
| debut | 198 |
| comeback | 179 |
| album | 101 |
| audition | 83 |
| tour | 66 |
| concert | 32 |
| fashion | 23 |
| skincare | 3 |
| beauty | 1 |
| merchandise / goods / lightstick | 0 |

### 4.3 시사점

- 가장 RPM이 높을 콘텐츠 풀(**audition + tour + concert + debut**) = 카테고리 audition 83 + tour 54 + 태그 debut 198 (중복 제거 시 대략 280~350 페이지)로 **전체의 23~28%**. silverdrive 한 페이지짜리 전략을 그대로는 못 쓰지만, "audition/tour/concert/debut 페이지에 ATF 300×250 1개 강제" 전략은 충분히 가능.
- "굿즈/응원봉/콘서트 패션" 키워드 태그는 사실상 0 — Coupang 활용처 외에는 콘텐츠 자체가 아직 없음. Phase 3에서 콘텐츠 생산 카테고리 조정으로 풀어야 할 별도 작업.

---

## 5. Phase 2 처방안 (우선순위 순)

> Phase 2 진입 전 운영자가 다음 3가지 결정 필요:
> 1. **AdSense 대시보드 Auto Ads on/off 확인** — off가 코드 의도. on이면 kpop의 Manual `<ins>`와 충돌해 PV당 노출 자체를 깎고 있을 가능성.
> 2. **AdSense 슬롯 7671594779 (display=bottomBanner) 사용 결정** — 신규 ATF 슬롯을 발급해 분리할지, 기존 ID 한쪽만 유지할지.
> 3. **개발/Preview 환경 정책** — 현재 dev/Preview에서도 광고 ins가 호출되고 있음. 즉시 막아도 무관한지.

### P0 — 즉시 (수익 직접 영향, 1~2일 작업)

1. **ATF 강제 슬롯 신설 — `<AtfRectangleAd>` 300×250 고정** (silverdrive 패턴 포팅)
   - article 페이지 `<header>` 안 또는 직후, **모바일 뷰포트에서 무조건 first viewport 안에 들어오는 위치**에 배치
   - `display: inline-block; width: 300px; height: 250px;` 고정 → CLS 0
   - AdSense 신규 slot ID 발급 (`andxo-atf-rect-kpop` 권장)
   - 운영자 결정 1 해결 후 진행

2. **slot ID 중복 해소** (`AD_SLOTS.display` ↔ `AD_SLOTS.bottomBanner`)
   - 두 ID 분리. `display`는 in-feed/홈 banner 전용, `bottomBanner`는 article 끝 전용
   - 결정 2 해결 후 진행

3. **dev/Preview ins 가드 추가** (silverdrive `AdUnit:32-64` 패턴)
   - `process.env.NODE_ENV === 'production'`이 아니면 dashed placeholder만 렌더
   - 무효 호출이 fill rate 측정을 오염시키는 것 방지

4. **`<BottomBannerAd>` 무조건 렌더로 변경**
   - `relatedArticles.length > 0` 조건 제거. 짧은 글에서도 끝 광고가 떠야 함
   - `article/[slug]/page.tsx:397-407` 수정

5. **InArticleAd 최소 1개 보장**
   - 현재 `contentSections.length < 2`이면 인아티클 0개 → 본문 길이가 짧아도 글 중간에 1개는 보장. 단순한 paragraph 카운트 기반 삽입 로직으로 fallback 추가

### P1 — 단주 내 (LCP/CLS·UX, 2~5일)

6. **AdSense 스크립트 lazy load** (silverdrive 패턴)
   - `AdSenseScript`를 `RootLayout`에서 제거
   - `<AdBanner>` 첫 인스턴스가 마운트될 때 한 번만 로드 (모듈 레벨 flag로 중복 방지)
   - `/privacy`, `/terms`, `/about` 등 광고 없는 페이지 LCP 보호

7. **`AdErrorBoundary` + 폴백 카드 도입**
   - kpop에는 fallback으로 `<AuditionPromoCard source="ad_fallback">` 또는 `<NewsletterInline>`을 쓰면 자연스러움
   - 광고 실패 시 빈 공간 → 자체 컨버전 동선으로 회복

8. **모든 광고 컴포넌트에 `min-height` 명시**
   - banner: 90px, rectangle: 250px, in-article: 250px, in-feed: 100px → CLS 가드

9. **모바일 anchor sticky 광고 도입 (선택)**
   - AdSense Anchor Ads 활용 (Auto Ads가 OFF여야 하므로 Manual로 도입)
   - PV당 노출 +1 보장. UX 해치지 않는 위치만 — 모바일 article 페이지 한정

10. **Disqus 지연 로드**
    - Disqus iframe이 LCP를 잡고 있어 ATF 광고 Active View를 잠식 가능성
    - IntersectionObserver로 fold 진입 시 로드

### P2 — 2주 이내 (구조적, RPM 천장 상향)

11. **카테고리별 광고 밀도 분기**
    - audition / tour / concert / debut 페이지: ATF 300×250 + in-article 2개 + 끝 banner (3 슬롯, 적게)
    - drama / news / celebrity 가십 페이지: in-article 1개 + 끝 banner (2 슬롯, 더 적게)
    - 슬롯 총량은 줄이고 Active View·fill을 끌어올리는 것이 silverdrive 교훈

12. **고단가 콘텐츠 페이지로 내부 링크 강제**
    - 일반 가십 글의 `AuditionPromoCard`처럼, drama/news 페이지에서 가까운 tour/comeback/audition 페이지로 funnel
    - kpop 자체 페이지 RPM을 올리는 것 + 메인 사이트 audition hub로의 traffic은 별도

13. **Coupang Partners 위치 재배치**
    - 현재 article 끝 `<CoupangBanner>` (line 368) → tour/concert 페이지에서는 InArticleAd 위치로 격상
    - 단, 한국 IP에서만 fill되는 점은 그대로 (해외 Vercel 빌드에서 빈 상품 → null 반환은 정상)

---

## 6. 작업 우선순위 한 줄 요약 (운영자 의사결정용)

> **가장 큰 한 방은 P0-1 `<AtfRectangleAd>` 300×250 신설.** silverdrive 골든 레시피의 핵심이고, 단독으로 페이지 RPM을 5~10배 끌어올릴 가능성이 높음.
>
> **두 번째는 P0-2 slot ID 중복 해소.** 코드 한 줄 수정인데 fill rate를 직접 깎고 있음.
>
> **세 번째는 P0-3 dev/Preview 가드.** 단가에는 영향 없지만 AdSense 정책 위반 및 통계 오염을 막음.

---

## 7. 본 감사 범위 밖 (참고용 인지)

- silverdrive 코드는 **read-only**로 참조했고 변경 없음
- `/Users/bon2/vibeprj/tistorymigration` (andxo.com 메인)은 열어보지 않음
- `/audition` 페이지를 kpop으로 이관하는 작업은 명시적으로 **금지** — 메인에서 잘 동작 중이고, kpop은 deep content 쪽으로 분업
- `silverdrive2`, `silverdrive2_backup`은 다른 BM 프로젝트로 무관

---

**Phase 2 진입을 위해 운영자 확인 필요:** §5 서두 결정 3가지 + 위 P0 5건 중 어디부터 착수할지.
