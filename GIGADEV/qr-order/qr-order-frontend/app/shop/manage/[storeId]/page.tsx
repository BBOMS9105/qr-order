"use client"

import React, { useEffect, useState, use, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import Cookies from "js-cookie"
import axios from "axios"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlusIcon, LogOut, Pencil, Trash2, Search } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Product {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  isAvailable: boolean
  storeId: string
  createdAt: string
  updatedAt: string
}

type AdminPageParams = {
  storeId: string;
};

// 정렬 옵션 타입 정의
type SortByType = "name" | "price" | "createdAt" | "updatedAt";
type OrderType = "ASC" | "DESC";

export default function AdminPage({ params }: { params: AdminPageParams | Promise<AdminPageParams> }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<SortByType>("createdAt")
  const [order, setOrder] = useState<OrderType>("DESC")
  
  const router = useRouter()
  const { toast } = useToast()
  
  const unwrappedParams = use(params as Promise<AdminPageParams>)
  const storeId = unwrappedParams.storeId

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.0.78:3002"

  const checkToken = async () => {
    const accessToken = Cookies.get("accessToken")
    if (!accessToken) return false
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/verify/${storeId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      return response.data.valid
    } catch (error) {
      return false
    }
  }

  const refreshToken = async () => {
    const token = localStorage.getItem("refreshToken")
    if (!token) return false
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: token })
      Cookies.set("accessToken", response.data.accessToken, { expires: 1 })
      localStorage.setItem("refreshToken", response.data.refreshToken)
      return true
    } catch (error) {
      return false
    }
  }

  const handleLogout = async () => {
    try {
      const accessToken = Cookies.get("accessToken")
      if (accessToken) {
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
      }
    } catch (error) {
      console.error("로그아웃 오류:", error)
    } finally {
      Cookies.remove("accessToken")
      localStorage.removeItem("refreshToken")
      toast({ title: "로그아웃 완료", description: "성공적으로 로그아웃되었습니다." })
      router.replace(`/auth/${storeId}`)
    }
  }

  const fetchProducts = useCallback(async () => {
    const accessToken = Cookies.get("accessToken")
    if (!accessToken) return false

    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append("searchTerm", searchTerm);
      if (sortBy) queryParams.append("sortBy", sortBy);
      if (order) queryParams.append("order", order);
      
      const response = await axios.get<Product[]>(
        `${API_BASE_URL}/shop/manage/${storeId}/products?${queryParams.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      setProducts(response.data)
      return true
    } catch (error) {
      console.error("상품 목록 로드 오류:", error)
      toast({
        title: "상품 목록 로드 실패",
        description: "상품 목록을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
      return false
    }
  }, [API_BASE_URL, storeId, searchTerm, sortBy, order, toast]);

  const deleteProduct = async (productId: string) => {
    const accessToken = Cookies.get("accessToken")
    if (!accessToken) return false
    try {
      await axios.delete(
        `${API_BASE_URL}/shop/manage/${storeId}/products/${productId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      return true
    } catch (error) {
      console.error("상품 삭제 오류:", error)
      return false
    }
  }

  useEffect(() => {
    const initPage = async () => {
      let isValid = await checkToken()
      if (!isValid) {
        const refreshed = await refreshToken()
        if (refreshed) isValid = true 
      }
      
      if (isValid) {
        setIsAuthorized(true)
        const loaded = await fetchProducts()
        if (!loaded && !toast) {
           console.error("데이터 로드 실패 알림을 표시할 수 없습니다 (toast 객체 없음).")
        }
      } else {
        if (toast) {
          toast({ title: "인증 필요", description: "로그인이 필요합니다.", variant: "destructive" })
        } else {
          console.error("인증 필요 알림을 표시할 수 없습니다 (toast 객체 없음).")
        }
        router.replace(`/auth/${storeId}`)
        return
      }
      setLoading(false)
    }
    initPage()
  }, [storeId, router, toast, fetchProducts])

  const openDeleteDialog = (productId: string) => {
    setProductToDelete(productId)
    setIsDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false)
    setProductToDelete(null)
  }

  const handleDelete = async () => {
    if (!productToDelete) return
    const success = await deleteProduct(productToDelete)
    if (success) {
      setProducts(products.filter(product => product.id !== productToDelete))
      toast({ title: "상품 삭제 완료", description: "상품이 성공적으로 삭제되었습니다." })
    } else {
      toast({ title: "상품 삭제 실패", description: "상품 삭제 중 오류가 발생했습니다.", variant: "destructive" })
    }
    closeDeleteDialog()
  }

  const formatPrice = (price: number) => new Intl.NumberFormat("ko-KR").format(price)

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>페이지를 불러오는 중입니다...</p>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>인증 중이거나 접근 권한이 없습니다. 로그인 페이지로 이동합니다...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-4">
        {/* 헤더 영역 */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">상품 관리</h1>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        {/* 검색 및 정렬 영역 */}
        <div className="flex flex-col space-y-2">
          {/* 검색창 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="상품명 또는 설명 검색"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                // 입력 시 바로 검색 실행
                fetchProducts();
              }}
              className="pl-10"
            />
          </div>

          {/* 정렬 옵션 */}
          <div className="flex space-x-2">
            <Select value={sortBy} onValueChange={(value: SortByType) => {
              setSortBy(value);
              fetchProducts();
            }}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">이름순</SelectItem>
                <SelectItem value="price">가격순</SelectItem>
                <SelectItem value="createdAt">최신순</SelectItem>
                <SelectItem value="updatedAt">수정일순</SelectItem>
              </SelectContent>
            </Select>

            <Select value={order} onValueChange={(value: OrderType) => {
              setOrder(value);
              fetchProducts();
            }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="정렬 방향" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASC">오름차순</SelectItem>
                <SelectItem value="DESC">내림차순</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 상품 추가 버튼 */}
        <Button asChild className="w-full">
          <Link href={`/shop/manage/${storeId}/add`}>
            <PlusIcon className="h-4 w-4 mr-2" />
            상품 추가
          </Link>
        </Button>

        {/* 상품 목록 */}
        <div className="grid grid-cols-1 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="flex items-center p-4">
                <div className="relative h-20 w-20 mr-4">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>
                      <p className="font-bold text-sm mt-1">{formatPrice(product.price)}원</p>
                    </div>
                    <div className="flex items-center space-x-2 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-8 w-8"
                      >
                        <Link href={`/shop/manage/${storeId}/edit/${product.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(product.id)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-1">
                    <span className={`text-xs px-2 py-1 rounded ${
                      product.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {product.isAvailable ? '판매중' : '품절'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상품 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 