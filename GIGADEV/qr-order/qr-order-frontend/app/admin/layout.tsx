"use client"

import type React from "react"

import { useEffect } from "react"
import { useUserStore } from "@/store/user-store"
import { useRouter } from "next/navigation"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { role, isAuthenticated } = useUserStore()
  const router = useRouter()

  // 인증되지 않은 사용자는 인증 페이지로 리다이렉트
  useEffect(() => {
    if (!isAuthenticated || role !== "owner") {
      router.push("/auth")
    }
  }, [isAuthenticated, role, router])

  // 인증된 사용자만 관리자 페이지 접근 가능
  if (!isAuthenticated || role !== "owner") {
    return null
  }

  return <>{children}</>
}
