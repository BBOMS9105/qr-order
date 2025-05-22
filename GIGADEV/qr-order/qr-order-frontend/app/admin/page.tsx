"use client"

import { useEffect, useState } from "react"
import { getProducts, deleteProduct, getProductsByStore } from "@/lib/actions"
import type { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useUserStore } from "@/store/user-store"
import { redirect, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
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
import { PlusIcon, Pencil, Trash2 } from "lucide-react"
import MobileLayout from "@/components/mobile-layout"

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const { toast } = useToast()
  const { role, isAuthenticated, storeId: savedStoreId } = useUserStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // URL에서 storeId 가져오기 또는 저장된 상점 ID 사용
  const storeId = searchParams.get("storeId") || savedStoreId || "550e8400-e29b-41d4-a716-446655440000"

  // 인증 상태 체크를 useEffect로 이동
  useEffect(() => {
    // 고객은 관리자 페이지에 접근할 수 없음
    if (role !== "owner" || !isAuthenticated) {
      // 현재 URL에 있는 storeId 유지하며 인증 페이지로 이동
      if (storeId) {
        router.replace(`/auth/${storeId}`);
      } else {
        router.replace("/auth");
      }
    }
  }, [role, isAuthenticated, router, storeId]);

  useEffect(() => {
    // 인증된 사용자만 상품 목록 로드
    if (isAuthenticated && role === "owner") {
      const fetchProducts = async () => {
        try {
          // 상점 ID에 해당하는 상품만 가져오기
          const data = await getProductsByStore(storeId)
          setProducts(data)
        } catch (error) {
          toast({
            title: "오류 발생",
            description: "상품 목록을 불러오는 중 오류가 발생했습니다.",
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }

      fetchProducts()
    }
  }, [toast, storeId, isAuthenticated, role])

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

    try {
      // 상점 ID와 함께 삭제 요청
      const result = await deleteProduct(productToDelete, storeId)

      if (result.success) {
        setProducts(products.filter((product) => product.id !== productToDelete))
        toast({
          title: "상품 삭제 완료",
          description: "상품이 성공적으로 삭제되었습니다.",
        })
      } else {
        toast({
          title: "상품 삭제 실패",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "상품 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      closeDeleteDialog()
    }
  }

  if (loading) {
    return (
      <MobileLayout title="상품 관리">
        <div className="flex items-center justify-center h-[70vh]">
          <p>로딩 중...</p>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="상품 관리" storeId={storeId}>
      <div className="p-4">
        <div className="flex justify-between mb-4">
          <p className="text-sm text-muted-foreground">상점 ID: {storeId}</p>
          <Button asChild size="sm">
            <Link href={`/admin/add?storeId=${storeId}`}>
              <PlusIcon className="mr-2 h-4 w-4" />
              상품 추가
            </Link>
          </Button>
        </div>

        <div className="space-y-4">
          {products.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">등록된 상품이 없습니다.</div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="border rounded-lg overflow-hidden bg-white">
                <div className="flex items-center p-3">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover rounded-md"
                    />
                  </div>

                  <div className="flex-1 min-w-0 ml-3">
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm font-semibold">{formatPrice(product.price)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8"
                    >
                      <Link href={`/admin/edit/${product.id}?storeId=${storeId}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => openDeleteDialog(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상품 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 상품을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  )
}
