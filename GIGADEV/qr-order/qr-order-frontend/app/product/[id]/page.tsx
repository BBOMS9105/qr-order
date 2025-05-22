import Image from "next/image"
import { getProduct } from "@/lib/actions"
import { formatPrice } from "@/lib/utils"
import AddToCartButton from "./add-to-cart-button"
import { notFound } from "next/navigation"

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProduct(params.id)

  if (!product) {
    notFound()
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="relative aspect-square">
        <Image
          src={product.image || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover rounded-lg"
          priority
        />
      </div>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-2xl font-bold mt-2">{formatPrice(product.price)}</p>
        </div>

        <div className="space-y-2">
          <p className="text-muted-foreground">재고: {product.stock}개</p>
          <p>{product.description}</p>
        </div>

        <AddToCartButton product={product} />
      </div>
    </div>
  )
}
