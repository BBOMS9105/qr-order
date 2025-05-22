"use client"

import { Button } from "@/components/ui/button"
import { useCartStore } from "@/store/cart-store"
import { useUserStore } from "@/store/user-store"
import { ArrowLeft, LogOut, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Badge } from "./ui/badge"

interface MobileHeaderProps {
  title?: string
  showBackButton?: boolean
  showCart?: boolean
  backUrl?: string
  storeId?: string
}

export default function MobileHeader({
  title = "모바일 쇼핑몰",
  showBackButton = false,
  showCart = false,
  backUrl,
  storeId,
}: MobileHeaderProps) {
  const { role, logout } = useUserStore()
  const { totalItems } = useCartStore()
  const router = useRouter()
  const pathname = usePathname()
  
  // URL에서 storeId 추출 (props로 전달받지 않은 경우)
  if (!storeId && pathname) {
    const matches = pathname.match(/\/shop\/([^\/]+)/)
    if (matches && matches[1]) {
      storeId = matches[1]
    }
  }
  
  // 기본 스토어 ID
  const defaultStoreId = "550e8400-e29b-41d4-a716-446655440000"
  // 사용할 스토어 ID (전달받은 것이 없으면 기본값 사용)
  const currentStoreId = storeId || defaultStoreId

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl)
    } else {
      router.back()
    }
  }

  const handleLogout = () => {
    logout()
    if (role === "owner") {
      router.push(`/shop/${currentStoreId}`)
    }
  }
  
  // 장바구니 링크 구성
  const cartLink = storeId ? `/cart?storeId=${storeId}` : "/cart"

  return (
    <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center">
          {showBackButton && (
            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-semibold truncate">{title}</h1>
        </div>

        <div className="flex items-center space-x-1">
          {role === "customer" && showCart && (
            <Button variant="ghost" size="icon" asChild>
              <Link href={cartLink} className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalItems() > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0"
                  >
                    {totalItems()}
                  </Badge>
                )}
              </Link>
            </Button>
          )}

          {role === "owner" && (
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
