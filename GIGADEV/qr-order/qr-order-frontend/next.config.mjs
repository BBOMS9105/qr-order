/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: true,
  },
  // Next.js 15 캐싱 설정
  experimental: {
    // 필요한 경우 실험적 기능 활성화
    serverActions: {
      bodySizeLimit: '2mb', // 서버 액션 요청 크기 제한 증가 (이미지 업로드용)
    },
  },
};

export default nextConfig;
