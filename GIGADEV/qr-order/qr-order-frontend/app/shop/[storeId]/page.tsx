export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getProductsByStore } from "@/lib/actions"
import MobileLayout from "@/components/mobile-layout"
import MobileProductCard from "@/components/mobile-product-card"
import type { Product } from "@/lib/types"

export default async function ShopPageWithStoreId({
  params,
}: {
  params: { storeId: string }
}) {
  // params를 비동기적으로 처리
  const resolvedParams = await Promise.resolve(params)
  const storeId = resolvedParams.storeId
  
  const products = await getProductsByStore(storeId)

  return (
    <MobileLayout 
      title={`상품 목록`} 
      showCart={true} 
      showMiniCart={true}
      storeId={storeId}
    >
      <div className="p-4 grid grid-cols-2 gap-4 pb-40">
        {products && products.length > 0 ? (
          products.map((product: Product) => (
            <MobileProductCard key={product.id} product={product} />
          ))
        ) : (
          <div className="col-span-2 text-center py-10">
            상품이 없거나, 로딩 중입니다...
          </div>
        )}
      </div>
    </MobileLayout>
  )
} 