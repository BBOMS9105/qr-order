"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { getProduct, updateProduct } from "@/lib/actions"
import type { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { useUserStore } from "@/store/user-store"
import { redirect } from "next/navigation"
import MobileLayout from "@/components/mobile-layout"
import ImageUpload from "@/components/image-upload"
import { Checkbox } from "@/components/ui/checkbox"
import { formatNumber } from "@/lib/utils"

export default function EditProductPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>("")
  const [isFree, setIsFree] = useState(false)
  const [price, setPrice] = useState<string>("")
  const [formattedPrice, setFormattedPrice] = useState<string>("")
  const { toast } = useToast()
  const router = useRouter()
  const { role, isAuthenticated, storeId: savedStoreId } = useUserStore()
  const searchParams = useSearchParams()
  
  // URL에서 storeId 가져오기 또는 저장된 상점 ID 사용
  const storeId = searchParams.get("storeId") || savedStoreId || ""

  // 인증 및 권한 검사를 useEffect로 이동
  useEffect(() => {
    // 고객은 상품 수정 페이지에 접근할 수 없음
    if (role !== "owner" || !isAuthenticated) {
      // 현재 URL에 있는 storeId 유지하며 인증 페이지로 이동
      if (storeId) {
        router.replace(`/auth/${storeId}`);
      } else {
        router.replace("/auth");
      }
      return;
    }
    
    // 상점 ID가 없으면 관리자 페이지로 리다이렉트
    if (!storeId) {
      router.replace("/admin");
    }
  }, [role, isAuthenticated, router, storeId]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProduct(params.id)
        if (data) {
          setProduct(data)
          setPrice(data.price.toString())
          setFormattedPrice(formatNumber(data.price))
          setImageUrl(data.image || "")
          setIsFree(data.price === 0)
        }
      } catch (error) {
        toast({
          title: "오류 발생",
          description: "상품 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [params.id, toast])

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "")
    setPrice(value)

    if (value) {
      const numberValue = parseInt(value, 10)
      setFormattedPrice(formatNumber(numberValue))
    } else {
      setFormattedPrice("")
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      formData.append("id", params.id)

      // 이미지 URL 추가
      formData.set("image", imageUrl)
      
      // 상점 ID 추가
      formData.set("storeId", storeId)

      // 무료 상품인 경우 가격을 0으로 설정
      if (isFree) {
        formData.set("price", "0")
      } else {
        // 콤마 제거하고 숫자만 전송
        const numericPrice = price.replace(/,/g, "")
        formData.set("price", numericPrice || "0") // 빈 문자열이면 0으로 설정
      }

      const result = await updateProduct(formData, storeId)

      if (result.success) {
        toast({
          title: "상품 수정 완료",
          description: "상품이 성공적으로 수정되었습니다.",
        })
        router.push(`/admin?storeId=${storeId}`)
      } else {
        toast({
          title: "상품 수정 실패",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "상품 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <MobileLayout title="상품 수정" showBackButton={true} backUrl={`/admin?storeId=${storeId}`} storeId={storeId}>
        <div className="flex items-center justify-center h-[70vh]">
          <p>로딩 중...</p>
        </div>
      </MobileLayout>
    )
  }

  if (!product) {
    return (
      <MobileLayout title="상품 수정" showBackButton={true} backUrl={`/admin?storeId=${storeId}`} storeId={storeId}>
        <div className="flex items-center justify-center h-[70vh]">
          <p>상품을 찾을 수 없습니다.</p>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="상품 수정" showBackButton={true} backUrl={`/admin?storeId=${storeId}`} storeId={storeId}>
      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">상품명</Label>
            <Input id="name" name="name" defaultValue={product.name} placeholder="상품명을 입력하세요" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">상품 설명</Label>
            <Textarea id="description" name="description" defaultValue={product.description} placeholder="상품 설명을 입력하세요" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox id="isFree" checked={isFree} onCheckedChange={(checked) => setIsFree(!!checked)} />
              <label
                htmlFor="isFree"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                무료 상품
              </label>
            </div>

            <Label htmlFor="price">가격</Label>
            <Input
              id="price"
              name="price"
              placeholder="가격을 입력하세요"
              value={formattedPrice}
              onChange={handlePriceChange}
              disabled={isFree}
              required={!isFree}
            />
          </div>

          <div className="space-y-2">
            <Label>상품 이미지</Label>
            <ImageUpload defaultImage={imageUrl} onImageChange={setImageUrl} />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "처리 중..." : "상품 수정"}
          </Button>
        </form>
      </div>
    </MobileLayout>
  )
}
