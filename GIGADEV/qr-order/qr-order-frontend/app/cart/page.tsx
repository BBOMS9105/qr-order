"use client"

import { useCartStore } from "@/store/cart-store"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/utils"
import Image from "next/image"
import Link from "next/link"
import { MinusIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useUserStore } from "@/store/user-store"
import { redirect, useSearchParams } from "next/navigation"
import MobileLayout from "@/components/mobile-layout"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, totalPrice } = useCartStore()
  const { role } = useUserStore()
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const searchParams = useSearchParams()
  
  // URL에서 storeId 가져오기
  const storeId = searchParams.get("storeId")
  
  // storeId가 없으면 메인 페이지로 리다이렉트
  useEffect(() => {
    if (!storeId) {
      redirect("/")
    }
  }, [storeId])

  // 수량 상태 초기화
  useEffect(() => {
    const initialQuantities: Record<string, number> = {}
    items.forEach((item) => {
      initialQuantities[item.product.id] = item.quantity
    })
    setQuantities(initialQuantities)
  }, [items])

  // 상점 주인은 장바구니 페이지에 접근할 수 없음
  if (role === "owner") {
    redirect("/admin")
  }

  const handleQuantityChange = (productId: string, value: string) => {
    const quantity = Number.parseInt(value)
    if (!isNaN(quantity) && quantity > 0) {
      setQuantities((prev) => ({ ...prev, [productId]: quantity }))
    }
  }

  const handleQuantityBlur = (productId: string) => {
    const quantity = quantities[productId]
    if (quantity && quantity > 0) {
      updateQuantity(productId, quantity)
    }
  }
  
  // 쇼핑 계속하기 링크
  const shopLink = storeId ? `/shop/${storeId}` : "/"
  
  // 체크아웃 링크
  const checkoutLink = storeId ? `/checkout?storeId=${storeId}` : "/checkout"

  if (items.length === 0) {
    return (
      <MobileLayout title="장바구니" showBackButton={true} backUrl={shopLink}>
        <div className="flex flex-col items-center justify-center h-[70vh] p-4">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">장바구니가 비어 있습니다.</p>
            <Button asChild>
              <Link href={shopLink}>쇼핑 계속하기</Link>
            </Button>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="장바구니" showBackButton={true} backUrl={shopLink} showMiniCart={true}>
      <div className="flex flex-col pb-40">
        <div className="divide-y">
          {items.map((item) => (
            <div key={item.product.id} className="flex items-center p-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <Image
                  src={item.product.image || "/placeholder.svg"}
                  alt={item.product.name}
                  fill
                  className="object-cover rounded-md"
                />
              </div>

              <div className="flex-1 min-w-0 ml-3">
                <h3 className="font-medium text-sm truncate">{item.product.name}</h3>
                <p className="text-xs text-muted-foreground">{formatPrice(item.product.price)} / 개</p>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const newQuantity = Math.max(1, item.quantity - 1)
                        updateQuantity(item.product.id, newQuantity)
                        setQuantities((prev) => ({ ...prev, [item.product.id]: newQuantity }))
                      }}
                    >
                      <MinusIcon className="h-3 w-3" />
                    </Button>

                    <Input
                      type="number"
                      min="1"
                      value={quantities[item.product.id] || item.quantity}
                      onChange={(e) => handleQuantityChange(item.product.id, e.target.value)}
                      onBlur={() => handleQuantityBlur(item.product.id)}
                      className="w-12 h-6 text-center p-0 text-sm"
                    />

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        const newQuantity = item.quantity + 1
                        updateQuantity(item.product.id, newQuantity)
                        setQuantities((prev) => ({ ...prev, [item.product.id]: newQuantity }))
                      }}
                    >
                      <PlusIcon className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-semibold">{formatPrice(item.product.price * item.quantity)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2Icon className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 결제 버튼 (하단 고정) */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium">총 결제 금액</span>
            <span className="text-lg font-bold">{formatPrice(totalPrice())}</span>
          </div>
          <Button asChild className="w-full">
            <Link href={checkoutLink}>결제하기</Link>
          </Button>
        </div>
      </div>
    </MobileLayout>
  )
}
