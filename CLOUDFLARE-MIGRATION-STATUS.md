# kpop.andxo.com → Cloudflare Pages 이전 (진행 상황·인수인계)

kpop-blog(Next.js 14)를 Vercel에서 **Cloudflare Pages(무료·무제한·상업허용)** 로 이전한다.
방식: **완전 static export → `wrangler pages deploy out`** (andxo.com에서 검증된 절차).
전체 절차/함정 원문: andxo-next repo의 `docs/CLOUDFLARE-MIGRATION-HANDOFF.md` 참조.

---

## ✅ 완료된 코드 변경 (이 repo, 아직 커밋 안 함)

- `next.config.js`: `output: 'export'` 추가, ISR용 `experimental.outputFileTracingIncludes` 제거 (images.unoptimized·trailingSlash 유지)
- `src/app/article/[slug]/page.tsx`: `dynamicParams=false` + `generateStaticParams` **전체 생성**(기존 최신30개 slice 제거), `revalidate` 제거
- `src/app/category/[slug]/page.tsx`: `dynamicParams=false`, `revalidate` 제거
- `src/app/artist/[slug]/page.tsx`: `dynamicParams=false`, `revalidate` 제거
- `src/app/tag/[slug]/page.tsx`: `dynamicParams=false`, `generateStaticParams`를 `getAllTags()` **전체(약 1,080개)** 로, `getAllTags` import 추가, `revalidate` 제거
- `src/app/api/syndication-kpop-2026/route.ts`: `force-dynamic` → `force-static`

## ⬜ 남은 작업 (순서대로)

1. **middleware 제거**: `rm src/middleware.ts`
   - 역할이던 ①vercel.app 차단(CF에선 불필요) ②국가(SG) 차단은 필요 시 Cloudflare **Security → WAF → Custom rules**(무료)로 이관
2. **로컬 빌드 검증**: `npm run build` → `out/` 생성 확인 (기사 1,840 + 태그 1,080 등 대량이라 수 분 소요)
   - 실패 시 stale 캐시면 `rm -rf .next` 후 재빌드
3. **Cloudflare 로그인**(최초 1회): `npx wrangler login`
4. **Pages 프로젝트 생성 + 배포**:
   ```bash
   npx wrangler pages project create kpop --production-branch=main
   npx wrangler pages deploy out --project-name=kpop --branch=main --commit-dirty=true
   ```
   - ⚠️ 반드시 **Pages 방식**(`wrangler pages deploy`). Workers Static Assets(`wrangler deploy`)는 한글 파일명 매니페스트 버그로 실패함
5. **`.pages.dev` 확인**: 배포 URL에서 홈·기사·태그·아티스트·`/api/syndication-kpop-2026` 정상 확인
   ```bash
   curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://kpop.pages.dev/
   ```
6. **도메인 연결**: CF → Workers & Pages → `kpop` → Custom domains → `kpop.andxo.com`
   - "externally managed DNS" 에러 시: `andxo.com` zone DNS에서 `kpop` 기존 레코드 삭제 후 재시도
   - ⚠️ 잘못 만든 Worker 프로젝트가 kpop.andxo.com을 가로채 "Hello world"가 뜨면 그 Worker 삭제(andxo에서 겪은 함정)
7. **자동 재배포**: 기존 `.github/workflows/fetch-and-deploy.yml`(뉴스 자동생성+배포) 끝에 CF Pages 배포 스텝 추가
   - `cloudflare/wrangler-action@v3` + `command: pages deploy out --project-name=kpop --branch=main --commit-dirty=true`
   - GitHub Secrets: `CLOUDFLARE_API_TOKEN`(Pages:Edit), `CLOUDFLARE_ACCOUNT_ID`=`6883b1d2c8fd9014064291c9a738520f`
   - 뉴스가 하루 여러 번 갱신되므로 자동 재배포가 andxo보다 중요
8. **커밋·push** (git user: andxo/dev@andxo.com, 원격: bksongtb-eng/kpop-blog)

## 배포 정보

- CF Pages 프로젝트명: **kpop**
- 도메인: **kpop.andxo.com** (andxo.com zone은 이미 Cloudflare 네임서버)
- CF Account ID: `6883b1d2c8fd9014064291c9a738520f`
- Vercel 프로젝트는 백업으로 유지

## ⚠️ 핵심 함정 (andxo에서 실제 겪음)

1. 한글/특수문자 파일명 → **Pages 방식 필수**(Workers assets는 실패)
2. OpenNext(@opennextjs/cloudflare) 쓰지 말 것 — 순수 static export로
3. Worker 프로젝트 ≠ Pages 프로젝트 — 커스텀 도메인 가로채기 주의
4. 도메인 연결 시 기존 DNS 레코드 삭제 먼저
