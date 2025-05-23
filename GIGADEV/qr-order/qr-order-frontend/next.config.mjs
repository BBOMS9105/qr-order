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
  // 사파리 Content-Type 오류 해결을 위한 강화된 헤더 설정
  async headers() {
    return [
      // 모든 정적 파일에 대한 기본 캐시 설정
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // JavaScript 파일들 - 더 포괄적인 패턴
      {
        source: '/_next/static/chunks/(.*).js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      {
        source: '/_next/static/js/(.*).js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
        ],
      },
      // CSS 파일들
      {
        source: '/_next/static/css/(.*).css',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
        ],
      },
      // 폰트 파일들
      {
        source: '/_next/static/media/(.*).woff2',
        headers: [
          {
            key: 'Content-Type',
            value: 'font/woff2',
          },
        ],
      },
      {
        source: '/_next/static/media/(.*).woff',
        headers: [
          {
            key: 'Content-Type',
            value: 'font/woff',
          },
        ],
      },
      // 모든 페이지에 CORS 허용 (필요시)
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
