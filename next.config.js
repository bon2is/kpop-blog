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
  // ISR/on-demand 렌더링으로 전환 (기존 output: 'export' 제거).
  // 빌드 시 전체 페이지를 굽지 않고, 개별 글은 첫 요청 시 생성 후 CDN 캐시된다.
  trailingSlash: true,
  // 서버리스 함수(람다)가 런타임에 마크다운/데이터 파일을 읽으므로 번들에 포함시킨다.
  // fs.readdirSync(동적 디렉토리)는 Next 파일 트레이서가 자동 감지하지 못한다.
  experimental: {
    outputFileTracingIncludes: {
      '/**': ['./content/posts/**', './public/data/**'],
    },
  },
}

module.exports = nextConfig
