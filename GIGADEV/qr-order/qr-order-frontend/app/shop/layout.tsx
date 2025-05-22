"use client"

import type React from "react"

import { useEffect } from "react"
import { useUserStore } from "@/store/user-store"

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { setRole } = useUserStore()

  // 상점 페이지에 접근하면 자동으로 customer 역할 설정
  useEffect(() => {
    setRole("customer")
  }, [setRole])

  return <>{children}</>
}
