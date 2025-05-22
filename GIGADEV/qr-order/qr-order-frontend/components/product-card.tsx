"use client"

import Image from "next/image"
import Link from "next/link"
import type { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { useUserRole } from "@/context/user-role-context"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { formatPrice } from "@/lib/utils"

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart()
  const { userRole } = useUserRole()
  const { toast } = useToast()

  const handleAddToCart = () => {
    addToCart(product, 1)
    toast({
      title: "장바구니에 추가됨",
      description: `${product.name}이(가) 장바구니에 추가되었습니다.`,
    })
  }

  return (
    <Card className="overflow-hidden">
      <Link href={`/product/${product.id}`}>
        <div className="aspect-square relative overflow-hidden">
          <Image
            src={product.image || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover transition-transform hover:scale-105"
          />
        </div>
        <CardHeader className="p-4">
          <h3 className="font-semibold text-lg truncate">{product.name}</h3>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-muted-foreground line-clamp-2 text-sm h-10">{product.description}</p>
          <div className="mt-2 flex justify-between items-center">
            <p className="font-bold">{formatPrice(product.price)}</p>
            <p className="text-sm text-muted-foreground">재고: {product.stock}개</p>
          </div>
        </CardContent>
      </Link>
      <CardFooter className="p-4">
        {userRole === "customer" ? (
          <Button onClick={handleAddToCart} className="w-full" disabled={product.stock <= 0}>
            {product.stock > 0 ? "장바구니에 추가" : "품절"}
          </Button>
        ) : (
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/admin/edit/${product.id}`}>상품 수정</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
