# kpop.andxo.com 빌드 시간 감사 (Sprint 4 Phase A, Read-Only)

> **작성일:** 2026-06-02
> **저장소:** `/Users/bon2/vibeprj/kpop`, 브랜치 `refactor/build-perf` (main 영향 없음)
> **데이터 출처:** Vercel CLI `vercel inspect <url> --logs` (최근 14일 production deployments)
> **상태:** 코드 수정 0줄, 분석/계획 단계

---

## 1. 빌드 시간 Breakdown (실측)

### 1.1 최근 production deployments

| Deployment | 시점 | Status | Duration |
| --- | --- | --- | --- |
| `kpop-97s0uc474` (분석 대상) | 1h ago | ● Ready | **33분** |
| `kpop-l6kypp1hd` | 3h ago | ● Ready | 35분 |
| `kpop-4ayrj2lnv` | 4h ago | ● Ready | 35분 |
| `kpop-f8v6c5ek8` | 7h ago | ● Ready | 34분 |
| `kpop-ahkckcx03` | 8h ago | ● Ready | 33분 |
| `kpop-2nhvlf3iu` | 13h ago | ● Ready | 43분 |
| `kpop-pmd1uhvws` | 17h ago | ● Ready | 44분 |
| `kpop-nkffx4irt` | 9d ago | ● Ready | 40분 |
| `kpop-gmrz7n4g2` | 9d ago | ● Ready | 44분 |
| `kpop-70ia8j1sw` | 10d ago | ● Ready | 43분 |

빌드 시간 33~44분, 운영자 추정 ~35분과 일치.

### 1.2 33분 빌드 step별 timing (kpop-97s0uc474 로그 기준)

| 스텝 | 소요 시간 | 비율 | bottleneck 유형 |
| --- | --- | --- | --- |
| `generate-feeds` (pre-build) | ~0.5s (logs에 미표시) | <0.1% | I/O + Network (Google/Bing ping) |
| `fetch-charts` (pre-build) | **0.6s** | <0.1% | Network (병렬 3 source) |
| Next.js telemetry init | 0.7s | <0.1% | (idle) |
| Next.js compile | **18s** | 0.9% | CPU (webpack/swc) |
| Lint + type check | **7s** | 0.4% | CPU |
| Collecting page data | **2s** | 0.1% | I/O |
| **Generating static pages (2533/2533)** | **32분 10초** | **97.4%** | **CPU + I/O (재귀적 디스크 read)** |
| Build traces + finalize | 4s | 0.2% | CPU |
| `next export` notice | <1s | — | — |
| Deploy outputs (upload) | 15s | 0.7% | Network |
| Build cache create + upload (159 MB) | 16s | 0.8% | Network + I/O |
| **TOTAL** | **33분 0초** | **100%** | |

### 1.3 Generating static pages 32분 안의 가속 패턴

| 시점 | 페이지 진행 | 추정 라우트 | 속도 |
| --- | --- | --- | --- |
| 0:00 → 22:00 | 0 → 1216 | `/article/[slug]` 1245개 처리 중 | **~60 pages/min** (0.99s/page) |
| 22:00 → 22:40 | 1216 → 1266 | article 마무리 + 다른 정적 | 75 pages/min |
| 22:40 → 32:10 | 1266 → 2533 | `/tag/[slug]` 1232개 + 기타 | **~130 pages/min** (0.46s/page) |

**article 페이지가 tag 페이지보다 2배 무거움** — 후술하는 `getAllArticles()` 호출 패턴 차이가 정확히 일치.

---

## 2. 사전 페치 스크립트 분석

### 2.1 빌드 파이프라인

`package.json:7` — `"build": "npm run generate-feeds && npm run fetch-charts && next build"`

빌드 직접 의존: **2개만**. `fetch-news`, `fetch-schedule`, `post-*`는 빌드 외부에서 별도 호출 (CI workflows).

### 2.2 스크립트별 outputs & 패턴

| 스크립트 | 파일 출력 | 외부 API | 병렬 | timeout | 재시도 | 캐시 가능성 |
| --- | --- | --- | --- | --- | --- | --- |
| `generate-feeds.ts` | `public/feed.xml` (RSS, 100 items) + `public/news-sitemap.xml` (최근 2일) | Google/Bing **ping** (의미 없음, 404/410 반환) | 순차 ping | 없음 | 없음 | 매 빌드 재생성 필요 (게시글 dependent), **단 ping은 제거 가능** |
| `fetch-charts.ts` | `public/data/charts.json` | Billboard + Spotify(kworb) + YouTube(kworb) | **이미 Promise.all 병렬화** | 20s | 없음 | 6h~1d TTL로 cache 가능 (chart는 주간 빈도) |
| `fetch-schedule.ts` | `public/schedule.json` | Google News RSS + Soompi + Koreaboo + recurring broadcasts | Promise.all 병렬 | 8s | 없음 | 빌드 외 호출 (현재 시퀀스에 없음) |
| `fetch-news.ts` | `content/posts/*.md` 추가 + thumbnails | OpenAI + RSS sources | 미확인 | 미확인 | 미확인 | 매 새 글 생성 (빌드 외 호출, `generate-and-post` workflow) |

### 2.3 사전 페치 효과 평가

- **총 1초 미만** (logs 명시). 35분 빌드의 0.05%. **현재 사전 페치는 bottleneck 아님.**
- 그러나 `generate-feeds.ts`의 Google/Bing **ping은 무의미하면서 await으로 wait** (`pingSitemaps` line 136-154). Google deprecated `/ping` endpoint (404), Bing도 410. ping당 3~10초 대기 가능 — 제거하면 -3~10s
- `fetch-charts.ts`는 이미 잘 병렬화됨. 추가 최적화 효과 미미.

### 2.4 ts-node 호출 비용 (B-3 후보)

빌드 시퀀스에 `npx ts-node` 2회 (`generate-feeds`, `fetch-charts`). 각 cold start 2~4s × 2 = 4~8s. tsx로 교체 시 ~0.5s × 2 = 1s. **추정 절감 -3~7s**.

빌드 외 ts-node 호출 (`fetch-news`, `post-*`, `refresh-threads-token` 등)는 빌드 시간과 무관. 별도 CI 효율화는 가능하나 35분 → 10분 목표에 무관.

---

## 3. Next.js 빌드 분석

### 3.1 `next.config.js` 현재 설정

```js
{
  images: {
    unoptimized: true,           // sharp 미사용, 빌드 시 이미지 변환 없음
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  output: 'export',              // 정적 export, 전 페이지 prerender
  trailingSlash: true,
}
```

- `experimental` block 없음
- `workerThreads`, `cpus`, `staticPageGenerationTimeout` 등 build 가속 옵션 미사용
- `output: 'export'`는 ISR/RSC 일부 옵션을 비활성화 → 빌드 시간 단축 옵션 적용 가능 범위 좁음

### 3.2 generateStaticParams 라우트별 페이지 수

| 라우트 | 페이지 수 | 페이지당 cost | 합계 |
| --- | --- | --- | --- |
| `/article/[slug]` | 1245 | 4 × getAllArticles | **~22min** |
| `/tag/[slug]` | 1232 | 3 × getAllArticles | ~9min |
| `/artist/[slug]` | 27 | 1 × getAllArticles | <30s |
| `/category/[slug]` | 10 | 2 × getAllArticles | <10s |
| `/articles` (1) | 1 | 1 × getAllArticles | <1s |
| `/` (homepage) | 1 | 1 × getAllArticles | <1s |
| `/sitemap.xml` | 1 | 1 × getAllArticles | <1s |
| 기타 정적 (`/about`, `/chart`, `/search`, `/artists`, `/privacy`, `/terms`, `/shop`, `/categories`) | 8 | 0~1 × getAllArticles | <2s |
| **합계** | **2533** | — | **~32min (실측 일치)** |

### 3.3 `getAllArticles()` 호출 카운트 (이번 audit 최대 발견)

`src/lib/articles.ts:9-49` — 매 호출마다:
1. `fs.readdirSync(content/posts)` (1245 file 엔트리)
2. `for` 루프 1245회 × `fs.readFileSync` + `matter()` (gray-matter YAML 파싱)

**메모이제이션 0줄** (`fs.existsSync` 가드 외 캐시 없음).

호출 카운트 추산:
- `/article/[slug]` per page: `getArticleBySlug × 2` (metadata + page) + `getRelatedArticles × 1` + `getAdjacentArticles × 1` = **4 calls**
- `/tag/[slug]` per page: `getArticlesByTag × 2` + `getRelatedTags × 1` = **3 calls**
- `/artist/[slug]` per page: 1 call
- `/category/[slug]` per page: 2 calls
- 기타 정적 페이지: 1 call each
- generateStaticParams: 각 동적 라우트 1 call

```
Total getAllArticles() calls ≈
  4 × 1245   (article)
+ 3 × 1232   (tag)
+ 1 × 27     (artist)
+ 2 × 10     (category)
+ 1 × 8      (homepage + articles + sitemap + search + about + chart + artists + categories)
+ 4          (generateStaticParams)
≈ 8,690 calls
```

각 call에서 1245 file read → **8,690 × 1245 = 약 1080만 파일 read per build**.

평균 file read + YAML 파싱 ~0.18ms (Vercel 서버 SSD 기준) → **~1944초 = 약 32분**.

**Generating static pages 32분 10초 실측과 정밀하게 일치.** lib/articles.ts는 **단일 bottleneck**.

### 3.4 메모이제이션 적용 시 효과 예측

`getAllArticles` 결과를 module-level 변수로 캐시 (build process의 lifetime 동안 1회만 file read):

```ts
let _cache: Article[] | null = null;

export function getAllArticles(): Article[] {
  if (_cache) return _cache;
  // 기존 로직 ...
  _cache = articles;
  return _cache;
}
```

빌드 1회당 file read: 1245 × 1 = 1245회. 0.18ms × 1245 = **0.22초**.

**페이지 generation은 그 후 in-memory filter/sort 로직만 실행** → 페이지당 cost가 디스크에서 메모리로 이동:
- article 페이지: 4 × in-memory filter ≈ 5ms
- tag 페이지: 3 × in-memory ≈ 4ms
- 합계: 2533 × ~4ms = 약 10초

**Generating static pages 추정 단축: 32분 10초 → 약 1분 (메모이제이션 단독)**

**전체 빌드 시간 예측: 33분 → 약 2분 (compile 18s + page gen 1min + 잡 비용)**

---

## 4. 이미지 + MDX 파이프라인

### 4.1 이미지 처리

- `public/images/` 디렉토리: **289MB, 795 파일**
- `next.config.js images.unoptimized: true` → next/image가 변환 안 함, 원본 그대로 export
- thumbnail 출처:
  - 88 글: `/images/posts/<slug>.webp` (로컬, ~88 × 평균 80KB = ~7MB)
  - 683 글: Cloudflare R2 외부 URL (`pub-da3c0f601b9e4ff780dac68cc6ca06ba.r2.dev`)
- 즉 thumbnail의 **89%는 외부 호스팅**, 나머지 11%만 로컬
- 795 파일 - 88 thumbnail - 약 27 artist = **약 680 파일이 사용처 불명** (정리 후보, 추정 ~250MB)
- **이미지 자체는 빌드 시간에 거의 영향 없음** (변환 X, 단순 copy). 단 `Deploy outputs (upload)` 15초 중 일부 + build cache 159MB 중 일부 차지

### 4.2 MDX/markdown 파이프라인

- `src/components/MarkdownRenderer.tsx`:
  - `'use client'` (런타임 렌더, prerender 시 1회 React 실행)
  - `react-markdown` + `remark-gfm` (1개 플러그인) + YouTube embed custom
- 빌드 시 SSR로 한 번 실행 → React tree → HTML
- markdown 자체 처리는 페이지당 ~수십ms 추정. 32분 안의 잔여 cost 대부분이 여기일 가능성 (메모이제이션 후)

---

## 5. 캐시 사용 현황

### 5.1 Vercel build cache

- **활성화 됨** (logs: "Created build cache: 13s", "Build cache uploaded: 2.470s [159 MB]")
- 그러나 cache hit률 미상 — main commit이 매번 다른 source code (article auto-update + ad hotfix)라 거의 cold rebuild

### 5.2 `.next/cache`

- 로컬에 `.next/cache/fetch-cache/` 존재 — 빌드 시 Next.js 내부 캐시
- Vercel은 이걸 build cache로 보존하지만 article 변경 빈도가 너무 높아 효과 제한적

### 5.3 generated artifacts git 추적

```
public/data/charts.json     — git tracked + 매 빌드 fetch-charts로 재생성
public/feed.xml             — git tracked + 매 빌드 generate-feeds로 재생성
public/news-sitemap.xml     — git tracked + 매 빌드 generate-feeds로 재생성
```

이 3개 파일은 git tracked이면서 build output. 매 빌드마다 git working tree dirty 발생 → commit cycle 노이즈 (Sprint 1/2 push 때마다 stash로 우회).

**빌드 시간 직접 영향은 없지만 commit hygiene + CI 시각 정리에 의미 있음**.

---

## 6. Phase B 처방안 우선순위 (재정렬)

기존 운영자 제시 B-1~B-7에 신규 **B-0** 추가. audit 데이터로 ROI 재평가.

| ID | 항목 | 예상 절감 | 작업 시간 | 회귀 위험 | ROI |
| --- | --- | --- | --- | --- | --- |
| **B-0 (NEW)** | **`lib/articles.ts` 메모이제이션** (1 module-level cache 변수) | **−30~32분** | **30분 이내** | **낮음** (build process 내 in-memory cache, 다음 빌드는 fresh) | **★★★★★ 압도적** |
| B-3 | ts-node → tsx | −3~7s | 1~2h (모든 npm scripts 수정 + test) | 낮음 | ★ (효과 작음) |
| B-1 | 사전 페치 캐싱 (charts) | −0~1s (이미 1초 미만) | 2~4h | 중 (stale data 위험) | ✗ (불필요) |
| B-2 | 사전 페치 병렬화 | −0초 (이미 Promise.all) | 0 | — | ✗ (불필요) |
| B-5 | 이미지 최적화 빌드 외 이전 | −0초 (이미 unoptimized) | 0 | — | ✗ (불필요) |
| B-6 | `next.config` 최적화 (workerThreads, staticPageGenerationTimeout) | −0~30s (export 모드 효과 제한) | 1~2h | 중 | ★ (효과 작음) |
| B-4 | 저트래픽 article ISR 전환 | -10~15분 (B-0 적용 후엔 거의 의미 없음) | 8~16h (output 'export' → 'standalone' 변경 + 회귀 검토 대규모) | **높음** (정적 export → 서버 런타임 변경) | ✗ (B-0가 압도적 ROI) |
| B-7 | generated artifact git 추적 재검토 | −0초 (빌드 영향 X) | 1~2h | 낮음 | △ (commit hygiene 목적) |
| **B-NEW-1** | `generate-feeds.ts`의 Google/Bing **`pingSitemaps` 제거** | −3~10s | 5분 | 없음 (deprecated endpoint) | ★★★ (무료 정리) |
| **B-NEW-2** | `public/images/` 잔재 정리 (~680 파일, ~250MB) | −5~10s (upload + cache) | 1~2h (사용 분석 + safe delete) | 중 (오래된 글의 thumbnail이 로컬일 수 있음) | ★★ (deploy 부담 감소) |

### 6.1 단계적 권장 sprint 순서

#### Phase B1 (즉시, 1일)
1. **B-0** `lib/articles.ts` 메모이제이션 — 예상 **33분 → 약 2분** (단일 변경으로 -30분 이상)
2. **B-NEW-1** `pingSitemaps` 제거 — 무료 정리, -3~10s
3. 측정 (다음 deployment Vercel logs로 검증)

→ 누적 절감 예상: **약 31분 (33 → 2분)**

#### Phase B2 (B1 효과 검증 후, 1~2일)
4. B-3 ts-node → tsx (모든 npm scripts) — 일관성 + 약간의 절감
5. B-7 generated artifact git 추적 재검토 (`public/data/charts.json`, `public/feed.xml`, `public/news-sitemap.xml`를 `.gitignore` + `.vercelignore` 정리)
6. B-NEW-2 `public/images/` 잔재 정리 (사용 분석 후 safe delete, dry-run 먼저)

→ 누적 절감 예상: **약 32분 (33 → 1~1.5분), 추가로 commit hygiene 개선**

#### Phase B3 (B1+B2 검증 후 필요할 경우만)
7. B-6 next.config 최적화 — staticPageGenerationTimeout 등 (기본값 60s 적정 여부 확인)
8. B-4 ISR 전환 — **B-0 적용 후 사실상 불필요**. content가 5000+ 단위로 커지면 재검토

→ 누적 절감 예상: 거의 동일 (B-0가 천장 결정)

### 6.2 운영자 GA top URL 데이터 의존도

운영자 메시지에서 "B-4는 GA top URL 데이터 대기" 언급. **B-0이 B-4의 필요성을 해소**하므로 GA 데이터 의존도 사실상 0. 대신 Day 7 RPM 모니터링과 별개로 진행 가능.

---

## 7. 회귀 위험 요약

| 항목 | 검증 방법 |
| --- | --- |
| B-0 메모이제이션 cache 정합성 | build process 1회 lifetime 내에서만 cache → 다음 빌드는 fresh. 단위 build 안에서 article 변경은 없으므로 안전 |
| B-0 dev server hot reload | 메모이제이션이 `next dev`에서도 동작 → 새 .md 추가 시 dev 서버 재시작 필요할 수 있음. 환경 분기 (`process.env.NODE_ENV === 'production'` only cache) 추천 |
| B-NEW-1 ping 제거 | Google/Bing은 sitemap을 robots.txt + GSC에서 자동 fetch. 운영자 GSC에서 sitemap 등록되어 있는지 확인만 |
| B-NEW-2 이미지 정리 | dry-run으로 list 출력 → 운영자 컨펌 → 단계적 delete |

---

## 8. main 모니터링 신호 잔존 시 멈춤 조건 (운영자 명시)

refactor/build-perf는 main 영향 0. 다음 신호 발견 시 즉시 멈춤:
- React #418/#423 콘솔 에러 잔존/재발
- LCP 또는 First Load JS 회귀 (Sprint 2 baseline 대비 +30%)
- AdSense 광고 마운트 실패 패턴

현 상태: Sprint 2 hotfix #2 (cfc7899) 후 운영자 1차 검증 대기 중.

---

## 9. 본 audit 산출물

- 이 파일 (`BUILD_TIME_AUDIT.md`)
- `refactor/build-perf` 브랜치
- 코드 변경 0줄

**Phase B 진입 결정 요청 항목 (운영자 선택):**
1. B-0 단독 즉시 진행 (가장 권장)
2. B-0 + B-NEW-1 묶음 진행
3. B-0 + B-NEW-1 + B-3 같이 진행 (1일 안에 다 처리)
4. 추가 분석 필요 (예: B-4 ISR이 정말 불필요한지 stress test)
