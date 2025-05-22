"use client"

import { useCartStore } from "@/store/cart-store"
import { formatPrice } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MinusIcon, PlusIcon, ShoppingBag, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { usePathname } from "next/navigation"

interface MiniCartProps {
  storeId?: string
}

export default function MiniCart({ storeId }: MiniCartProps) {
  const { items, removeFromCart, updateQuantity, totalPrice } = useCartStore()
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const pathname = usePathname()
  
  // URL에서 storeId 추출 (props로 전달받지 않은 경우)
  if (!storeId && pathname) {
    const matches = pathname.match(/\/shop\/([^\/]+)/)
    if (matches && matches[1]) {
      storeId = matches[1]
    }
  }
  
  // 기본 스토어 ID 설정
  const defaultStoreId = "550e8400-e29b-41d4-a716-446655440000"
  // 사용할 스토어 ID (전달받은 것이 없으면 기본값 사용)
  const currentStoreId = storeId || defaultStoreId
  
  // 결제 링크 생성
  const checkoutLink = `/checkout?storeId=${currentStoreId}`

  // 장바구니에 아이템이 있을 때만 미니 장바구니 표시
  useEffect(() => {
    setIsVisible(items.length > 0)

    // 수량 상태 초기화
    const initialQuantities: Record<string, number> = {}
    items.forEach((item) => {
      initialQuantities[item.product.id] = item.quantity
    })
    setQuantities(initialQuantities)
  }, [items])

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

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50"
    >
      {/* 접힌 상태에서 보이는 바 */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b ${isExpanded ? "" : "cursor-pointer"}`}
        onClick={() => !isExpanded && setIsExpanded(true)}
      >
        <div className="flex items-center">
          <ShoppingBag className="h-4 w-4 mr-2" />
          <span className="font-medium text-sm">장바구니 ({items.length}개 상품)</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={(e) => {
            e.stopPropagation()
            setIsExpanded(!isExpanded)
          }}
        >
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </div>

      {/* 품목 목록 (확장 상태에서만 표시) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 max-h-[30vh] overflow-auto">
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between py-2 border-b">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(item.product.price)}</p>
                    </div>

                    <div className="flex items-center space-x-1 ml-2">
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
                        className="w-10 h-6 text-center p-0 text-sm"
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

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 결제 정보 및 버튼 (항상 표시) */}
      <div className="p-3 bg-gray-50">
        <div className="flex justify-between items-center mb-3">
          <span className="font-medium text-sm">총 금액</span>
          <span className="text-base font-bold">{formatPrice(totalPrice())}</span>
        </div>
        <Button asChild className="w-full">
          <Link href={checkoutLink}>결제하기</Link>
        </Button>
      </div>
    </motion.div>
  )
}
