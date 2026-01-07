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
  // 정적 사이트 생성을 위한 설정
  output: 'export',
  trailingSlash: true,
}

module.exports = nextConfig
