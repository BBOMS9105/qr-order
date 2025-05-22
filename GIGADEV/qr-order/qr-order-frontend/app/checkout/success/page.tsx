"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { getOrder } from "@/lib/actions"
import { formatPrice } from "@/lib/utils"
import MobileLayout from "@/components/mobile-layout"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle, ShoppingBag } from "lucide-react"
import { motion } from "framer-motion"
import { useCartStore } from "@/store/cart-store"
import type { Order } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")
  const storeId = searchParams.get("storeId")
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { clearCart } = useCartStore()
  const { toast } = useToast()
  const hasAttemptedFetch = useRef(false)

  useEffect(() => {
    // 이미 fetch를 시도했다면 중복 실행 방지
    if (hasAttemptedFetch.current) return;
    
    // 주문 정보 가져오기
    const fetchOrder = async () => {
      hasAttemptedFetch.current = true;
      
      if (!orderId) {
        console.error("[결제 완료] 주문 ID가 없습니다.")
        setError("주문 정보가 없습니다. 올바른 경로로 접근해 주세요.")
        setLoading(false)
        return
      }

      try {
        console.log(`[결제 완료] 주문 정보 조회 시작 - 주문 ID: ${orderId}, 상점 ID: ${storeId}`)
        
        // 백엔드 API에서 주문 정보 가져오기
        const orderData = await getOrder(orderId);
        
        if (orderData) {
          console.log(`[결제 완료] 주문 데이터:`, orderData);
          setOrder(orderData);
          
          // 결제 완료 토스트 메시지 표시
          toast({
            title: "결제가 완료되었습니다",
            description: `주문 번호: ${orderId.substring(0, 20)}`,
            duration: 5000
          });
        } else {
          console.error(`[결제 완료] 주문 정보가 없습니다.`);
          
          // 세션 스토리지에서 백엔드가 확인한 주문 정보 확인
          let confirmedOrderData = null;
          
          try {
            const confirmedDataStr = sessionStorage.getItem('confirmedOrderData');
            if (confirmedDataStr) {
              confirmedOrderData = JSON.parse(confirmedDataStr);
              console.log('[결제 완료] 세션 스토리지에서 확인된 주문 정보 복원:', confirmedOrderData);
              
              // 주문 정보 생성
              const fallbackOrder: Order = {
                id: orderId,
                items: confirmedOrderData.items || [
                  {
                    productId: "fallback-product-id",
                    productName: "결제 완료 상품",
                    quantity: 1,
                    price: confirmedOrderData.totalAmount || 5000,
                  }
                ],
                totalAmount: confirmedOrderData.totalAmount || 5000,
                status: "completed",
                paymentMethod: confirmedOrderData.paymentMethod || "card",
                customerInfo: {
                  name: "고객님",
                  email: "customer@example.com",
                  phone: "010-0000-0000",
                  address: "서울시",
                },
                createdAt: confirmedOrderData.createdAt ? new Date(confirmedOrderData.createdAt) : new Date(),
              };
              
              setOrder(fallbackOrder);
              
              // 세션 스토리지에서 사용한 데이터는 삭제 (보안)
              sessionStorage.removeItem('confirmedOrderData');
              
              // 결제 완료 토스트 메시지 표시
              toast({
                title: "결제가 완료되었습니다",
                description: `주문 번호: ${orderId.substring(0, 20)}`,
                duration: 5000
              });
            } else {
              console.log('[결제 완료] 세션 스토리지에 확인된 주문 정보 없음');
              setError("주문 정보를 찾을 수 없습니다. 관리자에게 문의하세요.");
            }
          } catch (e) {
            console.error('[결제 완료] 세션 스토리지 데이터 파싱 오류:', e);
            setError("주문 정보 처리 중 오류가 발생했습니다.");
          }
        }
      } catch (err) {
        console.error(`[결제 완료] 주문 정보 조회 중 오류 발생:`, err)
        setError("주문 정보를 불러오는 중 오류가 발생했습니다.")
        toast({
          title: "오류 발생",
          description: "주문 정보를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive",
          duration: 5000
        })
      } finally {
        // 로딩 상태 변경
        setLoading(false)
      }
    }

    // 로딩 상태가 계속되는 문제 방지를 위한 타임아웃 설정
    const loadingTimeout = setTimeout(() => {
      if (loading && !hasAttemptedFetch.current) {
        console.log('[결제 완료] 로딩 타임아웃 - 강제로 로딩 상태 종료');
        hasAttemptedFetch.current = true;
        setLoading(false);
        setError("주문 정보 로딩 시간이 초과되었습니다. 네트워크 연결을 확인하세요.");
      }
    }, 5000); // 5초 후 로딩 강제 종료

    fetchOrder();
    
    // 장바구니 비우기 (API 호출 후에 실행)
    clearCart();

    // 컴포넌트 언마운트 시 타임아웃 정리
    return () => clearTimeout(loadingTimeout);
  }, [orderId, storeId, clearCart, toast]); // loading 의존성 제거

  // storeId가 없으면 메인 페이지 링크를 사용, 있으면 해당 상점 페이지 링크 사용
  const shopLink = storeId ? `/shop/${storeId}` : "/"

  if (loading) {
    return (
      <MobileLayout title="결제 완료" showBackButton={false}>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <p>주문 정보를 불러오는 중...</p>
        </div>
      </MobileLayout>
    )
  }

  if (error || !order) {
    return (
      <MobileLayout title="결제 완료" showBackButton={false}>
        <div className="flex flex-col items-center justify-center h-[70vh]">
          <p className="text-red-500 mb-4">{error || "주문 정보를 찾을 수 없습니다."}</p>
          <Button asChild className="mt-4">
            <Link href={shopLink}>쇼핑 계속하기</Link>
          </Button>
        </div>
      </MobileLayout>
    )
  }

  // 결제 방법 한글화
  const paymentMethodMap: Record<string, string> = {
    card: "신용카드",
    CARD: "신용카드",
    NORMAL: "신용카드",
    bank: "계좌이체",
    BANK: "계좌이체",
    phone: "휴대폰 결제",
    PHONE: "휴대폰 결제",
    tosspay: "토스페이",
    TOSSPAY: "토스페이",
    가상계좌: "가상계좌",
    VIRTUAL: "가상계좌",
    계좌이체: "계좌이체",
    TRANSFER: "계좌이체",
    culture: "문화상품권",
    cultureland: "컬쳐랜드",
    smartculture: "스마트문상",
    happymoney: "해피머니",
    booknlife: "도서문화상품권",
    point: "포인트 결제"
  }

  return (
    <MobileLayout title="결제 완료" showBackButton={false}>
      <div className="flex flex-col items-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }} className="mb-6">
          <CheckCircle className="h-24 w-24 text-green-500" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold mb-2"
        >
          결제가 완료되었습니다!
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground mb-8"
        >
          주문이 성공적으로 처리되었습니다.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full bg-white rounded-lg shadow-sm p-4 mb-4"
        >
          <h2 className="font-bold text-lg mb-3">주문 정보</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">주문 번호</span>
              <span className="font-medium">{order.id.substring(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">결제 시간</span>
              <span className="font-medium">
                {new Date(order.createdAt).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">결제 방법</span>
              <span className="font-medium">{paymentMethodMap[order.paymentMethod] || order.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">총 결제 금액</span>
              <span className="font-bold">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="w-full bg-white rounded-lg shadow-sm p-4 mb-8"
        >
          <h2 className="font-bold text-lg mb-3">구매 상품</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.productId} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity}개 x {formatPrice(item.price)}
                  </p>
                </div>
                <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="w-full"
        >
          <Button asChild className="w-full" size="lg">
            <Link href={shopLink}>
              <ShoppingBag className="mr-2 h-5 w-5" />
              쇼핑 계속하기
            </Link>
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  )
}
