"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUserStore } from "@/store/user-store"
import { useRouter } from "next/navigation"
import { ShoppingBag, User } from "lucide-react"

export default function RoleSelectPage() {
  const { setRole } = useUserStore()
  const router = useRouter()
  
  // 기본 스토어 ID 설정
  const defaultStoreId = "550e8400-e29b-41d4-a716-446655440000"

  const handleCustomerSelect = () => {
    setRole("customer")
    router.push(`/shop/${defaultStoreId}`)
  }

  const handleOwnerSelect = () => {
    setRole("owner")
    router.push(`/auth/${defaultStoreId}`)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-gradient-to-b from-blue-50 to-blue-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">모바일 쇼핑몰</CardTitle>
          <CardDescription>역할을 선택해주세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full h-20 text-lg justify-start" onClick={handleCustomerSelect}>
            <User className="mr-4 h-6 w-6" />
            고객으로 접속
          </Button>

          <Button variant="outline" className="w-full h-20 text-lg justify-start" onClick={handleOwnerSelect}>
            <ShoppingBag className="mr-4 h-6 w-6" />
            상점 주인으로 접속
          </Button>

          <p className="text-sm text-muted-foreground text-center mt-6">QR 코드를 통해 접속하셨습니다</p>
        </CardContent>
      </Card>
    </div>
  )
}
