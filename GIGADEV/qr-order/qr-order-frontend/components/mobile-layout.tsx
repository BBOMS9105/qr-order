"use client"

import type React from "react"
import MobileHeader from "./mobile-header"
import MiniCart from "./mini-cart"
import { usePathname } from "next/navigation"

interface MobileLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
  title?: string
  showBackButton?: boolean
  showCart?: boolean
  backUrl?: string
  showMiniCart?: boolean
  storeId?: string
}

export default function MobileLayout({
  children,
  showHeader = true,
  title,
  showBackButton = false,
  showCart = false,
  backUrl,
  showMiniCart = false,
  storeId,
}: MobileLayoutProps) {
  // URL에서 storeId 추출 (props로 전달받지 않은 경우)
  const pathname = usePathname()
  if (!storeId && pathname) {
    const matches = pathname.match(/\/shop\/([^\/]+)/)
    if (matches && matches[1]) {
      storeId = matches[1]
    }
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gray-50">
      {showHeader && (
        <MobileHeader 
          title={title} 
          showBackButton={showBackButton} 
          showCart={showCart} 
          backUrl={backUrl} 
          storeId={storeId}
        />
      )}
      <main className="flex-1 pb-safe">{children}</main>
      {showMiniCart && <MiniCart storeId={storeId} />}
    </div>
  )
}
