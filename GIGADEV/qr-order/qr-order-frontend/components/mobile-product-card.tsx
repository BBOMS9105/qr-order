"use client"

import Image from "next/image"
import type { Product } from "@/lib/types"
import { useCartStore } from "@/store/cart-store"
import { useUserStore } from "@/store/user-store"
import { useToast } from "@/components/ui/use-toast"
import { formatPrice } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface MobileProductCardProps {
  product: Product
}

export default function MobileProductCard({ product }: MobileProductCardProps) {
  const { addToCart } = useCartStore()
  const { role } = useUserStore()
  const { toast } = useToast()

  // 품절 여부 확인 (isAvailable이 false인 경우에만 품절로 간주)
  const isOutOfStock = product.isAvailable === false

  const handleAddToCart = () => {
    // 품절 상품은 장바구니에 추가할 수 없음
    if (isOutOfStock) {
      toast({
        title: "품절 상품",
        description: `${product.name}은(는) 현재 품절 상태입니다.`,
        duration: 1500,
        variant: "destructive",
      })
      return
    }
    
    addToCart(product, 1)
    toast({
      title: "장바구니에 추가됨",
      description: `${product.name}이(가) 장바구니에 추가되었습니다.`,
      duration: 1500,
    })
  }

  return (
    <Card className={`overflow-hidden h-full flex flex-col ${isOutOfStock ? 'opacity-70' : ''}`}>
      <div className="aspect-square relative">
        <Image src={product.image || "/placeholder.svg"} alt={product.name} fill className="object-cover" />
        {isOutOfStock && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive">품절</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-3 flex-1 flex flex-col">
        <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 h-8">{product.description}</p>
        <div className="mt-auto pt-2">
          <p className="font-bold text-sm mb-2">{formatPrice(product.price)}</p>

          {role === "customer" ? (
            <Button 
              onClick={handleAddToCart} 
              className="w-full" 
              size="sm" 
              variant="outline"
              disabled={isOutOfStock}
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1" />
              {isOutOfStock ? "품절" : "담기"}
            </Button>
          ) : (
            <Button variant="outline" className="w-full" size="sm" asChild>
              <a href={`/admin/edit/${product.id}`}>상품 수정</a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
