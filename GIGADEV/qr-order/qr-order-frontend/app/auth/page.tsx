"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useUserStore } from "@/store/user-store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"



export default function AccessDeniedPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-gradient-to-b from-red-50 to-red-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl">접근 불가</CardTitle>
          <CardDescription>잘못된 접근 경로입니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center">
            이 페이지는 직접 접근할 수 없습니다. 상점 ID를 포함한 정확한 URL로 접근해주세요.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            올바른 접근 형식: /auth/[상점ID]
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            className="w-full" 
            variant="default"
            onClick={() => router.push("/")}
          >
            메인 페이지로 이동
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
