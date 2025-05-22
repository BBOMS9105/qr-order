"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"
import MobileLayout from "@/components/mobile-layout"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { motion } from "framer-motion"

export default function CheckoutFailedPage() {
  const searchParams = useSearchParams()
  const errorCode = searchParams.get("error") || "UNKNOWN_ERROR"
  const errorMessage = searchParams.get("message") || "알 수 없는 오류가 발생했습니다."
  const orderId = searchParams.get("orderId") || ""
  const storeId = searchParams.get("storeId") || ""
  
  // 페이지 로드 시 디버깅 로그 출력
  useEffect(() => {
    console.log("[실패 페이지] 로드됨, 파라미터:", { 
      errorCode, 
      errorMessage: decodeURIComponent(errorMessage), 
      orderId, 
      storeId,
      전체URL: typeof window !== 'undefined' ? window.location.href : '없음'
    });
  }, [errorCode, errorMessage, orderId, storeId]);

  // 에러 코드에 따른 추가 안내 메시지
  const getErrorGuide = (code: string) => {
    switch (code) {
      case "PAYMENT_FAILED":
        return "결제 정보를 확인하고 다시 시도해주세요."
      case "INSUFFICIENT_STOCK":
        return "일부 상품의 재고가 부족합니다. 수량을 조정해주세요."
      case "PRODUCT_NOT_FOUND":
        return "일부 상품이 더 이상 판매되지 않습니다."
      case "SERVER_ERROR":
        return "서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      case "USER_CANCEL":
        return "사용자에 의해 결제가 취소되었습니다. 다시 시도해주세요."
      case "NEED_CARD_PAYMENT_DETAIL":
        return "카드 결제 정보를 선택하고 다시 시도해주세요."
      case "CARD_COMPANY_NOT_SELECTED":
        return "카드사를 선택하고 다시 시도해주세요."
      case "INVALID_CARD_COMPANY":
        return "유효하지 않은 카드사입니다. 다른 카드로 시도해주세요."
      case "DECLINED_PAYMENT":
        return "카드사에서 결제를 거부했습니다. 다른 카드로 시도해주세요."
      default:
        return "장바구니를 확인하고 다시 시도해주세요."
    }
  }

  return (
    <MobileLayout title="결제 실패" showBackButton={false}>
      <div className="flex flex-col items-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }} className="mb-6">
          <AlertCircle className="h-24 w-24 text-red-500" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold mb-2"
        >
          결제에 실패했습니다
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mb-8"
        >
          <p className="text-muted-foreground">{decodeURIComponent(errorMessage)}</p>
          <p className="text-sm mt-2">{getErrorGuide(errorCode)}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full space-y-3"
        >
          <Button asChild className="w-full" variant="outline">
            <Link href={storeId ? `/cart?storeId=${storeId}` : "/cart"}>
              <ArrowLeft className="mr-2 h-5 w-5" />
              장바구니로 돌아가기
            </Link>
          </Button>

          <Button asChild className="w-full">
            <Link href={storeId ? `/shop?storeId=${storeId}` : "/shop"}>쇼핑 계속하기</Link>
          </Button>
        </motion.div>
      </div>
    </MobileLayout>
  )
}
