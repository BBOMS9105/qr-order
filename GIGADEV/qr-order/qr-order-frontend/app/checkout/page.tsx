"use client"

import { useEffect } from "react"
import { redirect, useRouter, useSearchParams } from "next/navigation"
import { useCartStore } from "@/store/cart-store"
import { useUserStore } from "@/store/user-store"

export default function CheckoutPage() {
  const { items } = useCartStore()
  const { role } = useUserStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URL 파라미터에서 storeId 가져오기
  const storeId = searchParams.get("storeId")

  // 상점 주인은 결제 페이지에 접근할 수 없음
  if (role === "owner") {
    redirect("/admin")
  }

  // 장바구니가 비어있으면 장바구니 페이지로 리다이렉트
  if (items.length === 0) {
    redirect("/cart")
  }
  
  // storeId가 없으면 메인 페이지로 리다이렉트
  if (!storeId) {
    redirect("/")
  }

  // 클라이언트 사이드에서 toss 페이지로 바로 리다이렉트 (storeId 포함)
  useEffect(() => {
    router.replace(`/checkout/toss?storeId=${storeId}`)
  }, [router, storeId])

  // 페이지가 화면에 표시되지 않도록 null 반환
  return null
}
