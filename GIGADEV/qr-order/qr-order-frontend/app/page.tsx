import { redirect } from "next/navigation"

// 루트 페이지는 역할 선택 페이지로 리다이렉트
export default function Home() {
  // 기본 스토어 ID로 리다이렉트 (실제로는 역할 선택 페이지나 스토어 선택 페이지로 가야 함)
  // 여기서는 테스트용으로 기본 스토어 ID를 사용
  const defaultStoreId = "550e8400-e29b-41d4-a716-446655440000"
  redirect(`/shop/${defaultStoreId}`)
}
