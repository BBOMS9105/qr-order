"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Lock } from "lucide-react"
import Cookies from "js-cookie"
import axios from "axios"
import { use } from "react"

interface AuthResponse {
  message: string
  user: {
    id: string
    name?: string
  }
  storeId: string
  accessToken: string
  refreshToken: string
}

type ParamsType = {
  storeId: string
}

const AuthPage = ({ params }: { params: ParamsType | Promise<ParamsType> }) => {
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  
  // React.use()로 params unwrap하기
  const unwrappedParams = use(params as Promise<ParamsType>)
  const storeId = unwrappedParams.storeId
  
  // API 기본 URL 설정 (3002 포트 유지)
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.0.78:3002"

  // 토큰 관련 함수
  const setTokens = (accessToken: string, refreshToken: string) => {
    Cookies.set("accessToken", accessToken, { expires: 1 }) // 1일 후 만료
    localStorage.setItem("refreshToken", refreshToken) // 로컬 스토리지에 리프레시 토큰 저장
  }

  const clearTokens = () => {
    Cookies.remove("accessToken")
    localStorage.removeItem("refreshToken")
  }

  // 토큰 검증 함수
  const verifyToken = async () => {
    const accessToken = Cookies.get("accessToken")
    console.log("검증 시작 - 액세스 토큰 존재 여부:", !!accessToken)
    
    if (!accessToken) {
      return false
    }

    try {
      console.log(`토큰 검증 요청: ${API_BASE_URL}/auth/verify/${storeId}`)
      const response = await axios.get(`${API_BASE_URL}/auth/verify/${storeId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })
      console.log("토큰 검증 응답:", response.data)
      return response.data.valid
    } catch (error) {
      console.error("토큰 검증 오류:", error)
      return false
    }
  }

  // 토큰 리프레시 함수
  const refreshToken = async () => {
    const token = localStorage.getItem("refreshToken")
    console.log("리프레시 시작 - 리프레시 토큰 존재 여부:", !!token)
    
    if (!token) {
      return false
    }

    try {
      console.log("리프레시 토큰 요청")
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: token
      })
      
      console.log("리프레시 토큰 응답:", response.data)
      setTokens(response.data.accessToken, response.data.refreshToken)
      return true
    } catch (error) {
      console.error("리프레시 토큰 오류:", error)
      clearTokens()
      return false
    }
  }

  // 컴포넌트 마운트 시 토큰 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log("인증 상태 확인 시작")
        
        // 이미 확인된 경우 중복 실행 방지
        if (authChecked) {
          console.log("이미 인증 상태가 확인됨, 중복 실행 방지")
          return
        }
        
        // 1. 액세스 토큰 검증
        const isTokenValid = await verifyToken()
        console.log("액세스 토큰 유효 여부:", isTokenValid)
        
        if (isTokenValid) {
          setIsAuthenticated(true)
          setAuthChecked(true)
          // 유효한 토큰이 있으면 관리자 페이지로 이동
          toast({
            title: "인증 완료",
            description: "이미 로그인된 상태입니다. 관리자 페이지로 이동합니다.",
          })
          router.push(`/shop/manage/${storeId}`)
          return
        }

        // 2. 리프레시 토큰으로 액세스 토큰 갱신 시도
        const isRefreshed = await refreshToken()
        console.log("리프레시 토큰 갱신 여부:", isRefreshed)
        
        if (isRefreshed) {
          setIsAuthenticated(true)
          setAuthChecked(true)
          toast({
            title: "세션 복구 완료",
            description: "로그인 세션이 복구되었습니다. 관리자 페이지로 이동합니다.",
          })
          router.push(`/shop/manage/${storeId}`)
          return
        }
        
        // 인증 실패 시 로그인 화면 표시
        setAuthChecked(true)
        setIsAuthenticated(false)
      } catch (error) {
        console.error("인증 확인 중 오류:", error)
        setAuthChecked(true)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [storeId, router, toast, authChecked])

  // 로그인 처리
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // API 요청 로그 추가
      console.log(`로그인 시도: ${API_BASE_URL}/auth/login/${storeId}`, { password, storeId })
      
      const response = await axios.post<AuthResponse>(
        `${API_BASE_URL}/auth/login/${storeId}`,
        { 
          password,
          storeId  // 요청 본문에 storeId 추가
        }
      )

      console.log("로그인 응답:", response.data)
      
      const { accessToken, refreshToken } = response.data
      
      // 토큰 저장
      setTokens(accessToken, refreshToken)
      setIsAuthenticated(true)
      
      toast({
        title: "로그인 성공",
        description: "관리자 페이지로 이동합니다.",
      })
      
      // 관리자 페이지로 이동
      router.push(`/shop/manage/${storeId}`)
    } catch (error: any) {
      console.error("로그인 오류:", error)
      
      // 오류 상세 정보 로깅
      if (error.response) {
        console.log("오류 상태:", error.response.status)
        console.log("오류 데이터:", error.response.data)
      }
      
      let errorMessage = "로그인 중 오류가 발생했습니다."
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "비밀번호가 일치하지 않습니다."
        } else if (error.response.status === 404) {
          errorMessage = "해당 상점을 찾을 수 없습니다."
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message
        }
      }
      
      toast({
        title: "로그인 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4">
        <p>인증 상태 확인 중...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-4 bg-gradient-to-b from-blue-50 to-blue-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">상점 관리자 로그인</CardTitle>
          <CardDescription>관리자 권한으로 로그인하려면 비밀번호를 입력하세요</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  placeholder="관리자 비밀번호 입력"
                  required
                />
              </div>
              <p className="text-xs text-blue-600">상점 ID: {storeId}</p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "로그인 중..." : "로그인"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => router.push(`/shop/${storeId}`)}>
              고객 페이지로 이동
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default AuthPage 