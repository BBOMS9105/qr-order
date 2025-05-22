"use client"

import { useState } from "react"
import type { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { useUserRole } from "@/context/user-role-context"
import { useToast } from "@/components/ui/use-toast"
import { Input } from "@/components/ui/input"
import { MinusIcon, PlusIcon, ShoppingCart } from "lucide-react"
import Link from "next/link"

interface AddToCartButtonProps {
  product: Product
}

export default function AddToCartButton({ product }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1)
  const { addToCart } = useCart()
  const { userRole } = useUserRole()
  const { toast } = useToast()

  const handleAddToCart = () => {
    addToCart(product, quantity)
    toast({
      title: "장바구니에 추가됨",
      description: `${product.name} ${quantity}개가 장바구니에 추가되었습니다.`,
    })
  }

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity((prev) => prev + 1)
    }
  }

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1)
    }
  }

  if (userRole === "owner") {
    return (
      <Button variant="outline" asChild>
        <Link href={`/admin/edit/${product.id}`}>상품 수정</Link>
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" onClick={decrementQuantity} disabled={quantity <= 1}>
          <MinusIcon className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min="1"
          max={product.stock}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-20 text-center"
        />
        <Button variant="outline" size="icon" onClick={incrementQuantity} disabled={quantity >= product.stock}>
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      <Button onClick={handleAddToCart} className="w-full" disabled={product.stock <= 0}>
        <ShoppingCart className="mr-2 h-5 w-5" />
        {product.stock > 0 ? "장바구니에 추가" : "품절"}
      </Button>
    </div>
  )
}
