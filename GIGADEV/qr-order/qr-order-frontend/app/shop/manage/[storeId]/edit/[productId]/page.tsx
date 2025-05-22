"use client"

import React, { useState, useEffect, use, ChangeEvent } from "react"
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
import { ArrowLeft, UploadCloud } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"

interface ProductResponse {
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

interface EditProductPageParams {
  storeId: string;
  productId: string;
}

export default function EditProductPage({ 
  params 
}: { 
  params: EditProductPageParams | Promise<EditProductPageParams> 
}) {
  const unwrappedParams = use(params as Promise<EditProductPageParams>);
  const { storeId, productId } = unwrappedParams;

  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const router = useRouter()
  const { toast } = useToast()

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"

  const formatPrice = (value: string | number): string => {
    const numValue = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, ""), 10) : value;
    if (isNaN(numValue)) return ""
    if (numValue < 0) return "0"
    if (numValue > 99999999) return "99,999,999"
    return numValue.toLocaleString('ko-KR')
  }

  const handlePriceChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPrice(formatPrice(e.target.value))
  }

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

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

  useEffect(() => {
    const initPage = async () => {
      let isValid = await checkToken()
      if (!isValid) {
        const refreshed = await refreshToken()
        if (refreshed) isValid = true
      }
      
      if (isValid) {
        setIsAuthorized(true)
        const accessToken = Cookies.get("accessToken")
        try {
          const response = await axios.get<ProductResponse>(
            `${API_BASE_URL}/shop/manage/${storeId}/products/${productId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          const productData = response.data
          console.log("[Debug] Fetched product isAvailable:", productData.isAvailable);
          setProductName(productData.name || "")
          setDescription(productData.description || "")
          setPrice(formatPrice(productData.price))
          if (productData.image) {
            setExistingImageUrl(productData.image);
            setImagePreview(productData.image);
          }
          setIsAvailable(productData.isAvailable);
        } catch (error) {
          console.error("상품 정보 로드 오류:", error)
          toast({
            title: "데이터 로드 실패",
            description: "상품 정보를 불러오는데 실패했습니다.",
            variant: "destructive",
          })
          router.replace(`/shop/manage/${storeId}`)
          return
        }
      } else {
        toast({
          title: "인증 필요",
          description: "로그인이 필요합니다.",
          variant: "destructive",
        })
        router.replace(`/auth/${storeId}`)
        return
      }
      setIsLoading(false)
    }
    initPage()
  }, [storeId, productId, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    const numericPrice = parseInt(price.replace(/[^0-9]/g, ""), 10)
    if (isNaN(numericPrice) || numericPrice < 0 || numericPrice > 99999999) {
      toast({
        title: "입력 오류",
        description: "유효한 가격을 입력하세요 (0 ~ 99,999,999).",
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const accessToken = Cookies.get("accessToken")
      if (!accessToken) throw new Error("인증 토큰이 없습니다.")

      // 기본 데이터 구성
      const productData = {
        name: productName,
        description,
        price: numericPrice,
        storeId,
        isAvailable
      };

      let response;
      
      if (imageFile) {
        // 이미지가 있는 경우 FormData 사용
        const formData = new FormData();
        Object.entries(productData).forEach(([key, value]) => {
          formData.append(key, value?.toString() ?? '');
        });
        formData.append("image", imageFile);
        
        response = await axios.put(
          `${API_BASE_URL}/shop/manage/${storeId}/products/${productId}`,
          formData,
          { 
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'multipart/form-data',
            }
          }
        );
      } else {
        // 이미지가 없는 경우 JSON으로 전송
        response = await axios.put(
          `${API_BASE_URL}/shop/manage/${storeId}/products/${productId}`,
          productData,
          { 
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }
          }
        );
      }

      toast({
        title: "상품 수정 성공",
        description: "상품이 성공적으로 수정되었습니다.",
      })
      router.push(`/shop/manage/${storeId}`)
    } catch (error: any) {
      console.error("상품 수정 오류:", error)
      let errorMessage = "상품 수정 중 오류가 발생했습니다."
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message
      }
      toast({
        title: "상품 수정 실패",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-screen"><p>로딩 중...</p></div>
  if (!isAuthorized) return <div className="flex items-center justify-center h-screen"><p>인증 중...</p></div>

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <Button variant="ghost" className="mb-4" onClick={() => router.push(`/shop/manage/${storeId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> 뒤로 가기
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>상품 수정</CardTitle>
          <CardDescription>상품 정보를 수정하세요.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="productName">상품명</Label>
              <Input id="productName" value={productName} onChange={(e) => setProductName(e.target.value)} required placeholder="상품명을 입력하세요" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">상품 설명</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="상품 설명을 입력하세요 (선택사항)" className="min-h-[100px]" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">가격 (원)</Label>
              <Input id="price" type="text" value={price} onChange={handlePriceChange} required placeholder="0 ~ 99,999,999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">상품 이미지 (선택 사항)</Label>
              <div className="flex items-center justify-center w-full">
                <label htmlFor="dropzone-file-edit" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                  {imagePreview ? (
                    <Image src={imagePreview} alt="이미지 미리보기" width={200} height={200} className="object-contain h-full p-2" />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF (MAX. 1MB)</p>
                    </div>
                  )}
                  <Input id="dropzone-file-edit" type="file" className="hidden" onChange={handleImageChange} accept="image/png, image/jpeg, image/gif" />
                </label>
              </div>
              {imageFile && <p className="text-xs text-muted-foreground mt-1">선택된 파일: {imageFile.name}</p>}
              {!imageFile && existingImageUrl && <p className="text-xs text-muted-foreground mt-1">현재 이미지: {existingImageUrl.split('/').pop()}</p>}
            </div>
            <div className="flex items-center space-x-2 pt-4">
              <input
                type="checkbox"
                id="isOutOfStock"
                checked={!isAvailable}
                onChange={(e) => {
                  const newIsAvailable = !e.target.checked;
                  setIsAvailable(newIsAvailable);
                  console.log("[Debug] Checkbox changed. New isAvailable (boolean):", newIsAvailable);
                }}
                className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <Label htmlFor="isOutOfStock" className="text-sm font-medium text-gray-700 cursor-pointer">
                품절 처리 (체크 시 품절 상태가 됩니다)
              </Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "처리 중..." : "상품 수정"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 