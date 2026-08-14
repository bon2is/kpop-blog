/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // 완전 static export(SSG). Cloudflare Pages에 out/ 정적 배포.
  // 모든 페이지를 빌드 타임에 굽는다(런타임 서버리스 없음 → 무료 정적 호스팅).
  output: 'export',
  trailingSlash: true,
}

module.exports = nextConfig
