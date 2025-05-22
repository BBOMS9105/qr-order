import { redirect } from "next/navigation"

export default async function ShopListPage() {
  // shop 경로로의 직접 접근을 차단하고 루트 페이지로 리다이렉트
  redirect("/")
}
