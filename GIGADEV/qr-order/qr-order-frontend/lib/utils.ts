import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(price)
}

// 숫자에 3자리마다 콤마 추가
export function formatNumber(value: number | string): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

// 콤마가 포함된 문자열에서 숫자만 추출
export function parseNumber(value: string): number {
  return Number.parseInt(value.replace(/,/g, ""), 10) || 0
}

// 현재 환경에 따른 기본 URL 반환
export function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    // 브라우저 환경에서는 현재 호스트를 사용
    return "";
  }
  
  // 서버 환경에서는 환경 변수 또는 기본값 사용
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
}
