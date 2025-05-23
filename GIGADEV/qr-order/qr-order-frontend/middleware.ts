import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname
  
  // 모든 정적 파일에 대한 강화된 MIME 타입 설정
  if (pathname.startsWith('/_next/static/') || pathname.startsWith('/static/')) {
    // JavaScript 파일
    if (pathname.includes('.js') || pathname.endsWith('.js')) {
      response.headers.set('Content-Type', 'application/javascript; charset=utf-8')
      response.headers.delete('X-Content-Type-Options')
    }
    // CSS 파일
    else if (pathname.includes('.css') || pathname.endsWith('.css')) {
      response.headers.set('Content-Type', 'text/css; charset=utf-8')
      response.headers.delete('X-Content-Type-Options')
    }
    // 폰트 파일
    else if (pathname.endsWith('.woff2')) {
      response.headers.set('Content-Type', 'font/woff2')
    }
    else if (pathname.endsWith('.woff')) {
      response.headers.set('Content-Type', 'font/woff')
    }
    else if (pathname.endsWith('.ttf')) {
      response.headers.set('Content-Type', 'font/ttf')
    }
    // 이미지 파일
    else if (pathname.endsWith('.svg')) {
      response.headers.set('Content-Type', 'image/svg+xml')
    }
    else if (pathname.endsWith('.png')) {
      response.headers.set('Content-Type', 'image/png')
    }
    else if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
      response.headers.set('Content-Type', 'image/jpeg')
    }
    
    // 캐시 설정 추가
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    
    // 사파리 호환성을 위해 모든 정적 파일에서 X-Content-Type-Options 제거
    response.headers.delete('X-Content-Type-Options')
  }
  
  // CORS 헤더 추가 (필요시)
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return response
}

export const config = {
  matcher: [
    '/_next/static/:path*',
    '/static/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 