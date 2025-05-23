'use client';

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/cart-store";
import MobileLayout from "@/components/mobile-layout";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Script from "next/script";
import { confirmPayment, cancelOrder } from "@/lib/toss-payments-api";

// 토스페이먼츠 타입 정의
declare global {
  interface Window {
    PaymentWidget: any;
    paymentWidget: any;
    paymentMethodsWidget: any;
  }
}

// 토스페이먼츠 클라이언트 키
const TOSS_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

// 고객 식별 키 생성 함수
const generateCustomerKey = () => {
  // 강력한 고유성을 위해 Date.now()와 Math.random() 조합 사용
  const key = `customer_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  // 키 유효성 검사 강화
  if (!key || typeof key !== 'string' || key.length < 10) { // 최소 길이 기준 강화
    console.error("[DEBUG] CRITICAL: generateCustomerKey produced invalid key:", key);
    // 더욱 강력한 폴백 키 생성
    return `customer_fallback_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }
  return key;
};

function TossPaymentContent() {
  const { items, removeFromCart, updateQuantity, totalPrice, clearCart } = useCartStore();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL의 검색 파라미터에서 storeId 가져오기
  const storeId = searchParams.get("storeId");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentWidgetLoaded, setPaymentWidgetLoaded] = useState(false);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
  const [unavailableProducts, setUnavailableProducts] = useState<string[]>([]);
  const customerKeyRef = useRef(""); // 초기값을 빈 문자열로 설정

  // storeId가 없으면 메인 페이지로 리다이렉트
  useEffect(() => {
    if (!storeId) {
      console.log("[DEBUG] storeId가 없습니다. 메인 페이지로 리다이렉트합니다.");
      router.push("/");
    }
  }, [storeId, router]);

  // customerKeyRef 초기화 로직 강화
  useEffect(() => {
    if (!customerKeyRef.current) {
      const newKey = generateCustomerKey();
      console.log("[DEBUG] customerKeyRef.current is uninitialized. Generating new key:", newKey);
      customerKeyRef.current = newKey;
    }
  }, []); // 페이지 로드 시 한 번만 실행

  console.log("[DEBUG] TossPaymentPage mounted/re-rendered. Initial customerKeyRef.current:", customerKeyRef.current);

  // 페이지 가시성 변경 시 처리 중 상태 초기화
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("[DEBUG] Page became visible. isProcessing:", isProcessing);
        if (isProcessing) {
          console.log("[DEBUG] Page visible and isProcessing is true, setting to false.");
          setIsProcessing(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isProcessing]);
  
  const initPaymentWidget = () => {
    console.log("[DEBUG] initPaymentWidget 함수 호출됨. window.PaymentWidget 존재 여부:", !!window.PaymentWidget, "customerKey:", customerKeyRef.current);
    if (!customerKeyRef.current) {
      console.warn("[DEBUG] initPaymentWidget: customerKeyRef.current가 비어있어 재생성 시도.");
      customerKeyRef.current = generateCustomerKey();
      if (!customerKeyRef.current) {
        console.error("[DEBUG] CRITICAL: customerKey 재생성 실패. 위젯 초기화 중단.");
        toast({ title: "결제 시스템 오류", description: "고객 정보를 생성하는데 실패했습니다. 새로고침 후 다시 시도해주세요.", variant: "destructive" });
        return false;
      }
      console.log("[DEBUG] initPaymentWidget: customerKey 재생성 완료:", customerKeyRef.current);
    }

    if (!window.PaymentWidget) {
      console.log("[DEBUG] PaymentWidget이 아직 로드되지 않았습니다. 초기화를 건너뜁니다.");
      return false;
    }
    if (paymentWidgetLoaded) {
      console.log("[DEBUG] 위젯이 이미 로드되어 있습니다. 초기화를 건너뜁니다.");
      return true;
    }
    const currentTotalPrice = totalPrice();
    if (currentTotalPrice <= 0) {
      console.log("[DEBUG] 초기화 중단: totalPrice가 0 이하입니다. totalPrice:", currentTotalPrice);
      return false;
    }
    try {
      console.log("[DEBUG] 결제 위젯 초기화 시도. customerKey:", customerKeyRef.current, "totalPrice:", currentTotalPrice);
      const paymentWidget = window.PaymentWidget(TOSS_CLIENT_KEY, customerKeyRef.current);
      const paymentMethodsWidget = paymentWidget.renderPaymentMethods(
        "#payment-widget",
        { value: currentTotalPrice },
        { variantKey: "DEFAULT" }
      );
      window.paymentWidget = paymentWidget;
      window.paymentMethodsWidget = paymentMethodsWidget;
      setPaymentWidgetLoaded(true);
      console.log("[DEBUG] 결제 위젯이 성공적으로 초기화되었습니다");
      return true;
    } catch (error) {
      console.error("[DEBUG] 결제 위젯 초기화 중 오류:", error);
      setPaymentWidgetLoaded(false);
      return false;
    }
  };
  
  useEffect(() => {
    if (items.length === 0 && !isPaymentSuccess) {
      console.log("[DEBUG] 장바구니 비어있음 (결제 성공 아님). /cart로 리다이렉트.");
      router.push("/cart");
    }
  }, [items, router, isPaymentSuccess]);
  
  useEffect(() => {
    if (items.length > 0 && paymentWidgetLoaded === false && storeId) { // paymentWidgetLoaded 상태 및 storeId 존재 여부 추가 체크
      console.log("[DEBUG] 장바구니에 상품 존재 및 위젯 로드 안됨. 위젯 초기화 시도 (타이머 설정).");
      // 스크립트가 로드될 시간을 좀 더 확보하고, customerKey가 확실히 설정된 후 실행되도록 타이밍 조정
      const timerId = setTimeout(() => {
        if (customerKeyRef.current && window.PaymentWidget) {
          initPaymentWidget();
        } else {
          console.warn("[DEBUG] 위젯 초기화 조건 미충족 (customerKey 또는 PaymentWidget 부재), 재시도 예정 안 함.");
        }
      }, 700); // 타이머 시간을 약간 늘림
      return () => clearTimeout(timerId);
    }
  }, [items, paymentWidgetLoaded, storeId]); // paymentWidgetLoaded, storeId 의존성 추가
  
  useEffect(() => {
    // 토스페이먼츠 결제 후 리다이렉트로 돌아온 경우 파라미터 처리
    const paymentKey = searchParams.get("paymentKey");
    const orderId = searchParams.get("orderId");
    const amountParam = searchParams.get("amount");
    const paymentType = searchParams.get("paymentType");
    
    // 전체 URL 및 파라미터 로깅
    console.log("[결제완료] URL 파라미터 확인:", { 
      paymentKey, 
      orderId, 
      amount: amountParam, 
      storeId, 
      paymentType,
      전체URL: typeof window !== 'undefined' ? window.location.href : '없음'
    });

    // 결제 완료 후 리다이렉트된 경우만 처리 (paymentKey가 있는 경우)
    if (paymentKey && orderId && amountParam) {
      // 중복 실행 방지
      if (isPaymentSuccess) {
        console.log("[결제완료] 이미 결제 처리가 진행 중이거나 완료됨. 중복 실행 방지.");
        return;
      }
      
      console.log("[결제완료] 결제 승인 프로세스 시작");
      setIsPaymentSuccess(true);
      
      // 1. 금액 변환
      const amount = Number(amountParam);
      if (isNaN(amount)) {
        console.error("[결제완료] 금액 변환 실패:", amountParam);
        return;
      }
      
      // 2. orderId에서 storeId 추출 (주문번호 형식: order_storeId_timestamp_random)
      let storeIdFromOrderId = "";
      const orderIdParts = orderId.split('_');
      if (orderIdParts.length >= 3) {
        storeIdFromOrderId = orderIdParts[1];
      }
      console.log("[결제완료] 주문번호에서 추출한 storeId:", storeIdFromOrderId);
      
      // 3. 사용할 storeId 결정 (URL 파라미터 > 주문번호에서 추출)
      const effectiveStoreId = storeId || storeIdFromOrderId || "";
      if (!effectiveStoreId) {
        console.error("[결제완료] 유효한 storeId를 찾을 수 없습니다.");
      }
      
      // 4. 결제 확인 및 주문 처리
      (async () => {
        try {
          // 로딩 상태 설정
          setIsProcessing(true);
          
          // confirmPayment 함수 사용하여 백엔드 API 호출
          console.log("[결제완료] 백엔드 결제 확인 API 호출 준비:", { 
            paymentKey, 
            orderId, 
            amount, 
            storeId: effectiveStoreId 
          });
          
          const result = await confirmPayment({
            paymentKey,
            orderId,
            amount,
            storeId: effectiveStoreId
          });
          
          console.log("[결제완료] 백엔드 결제 확인 성공:", result);
          
          // 결제 확인 성공 시
          if (result.success) {
            console.log("[결제완료] 💰💰💰 결제 확인 완료");
            
            // 주문 정보 세션 스토리지에 저장 (성공 페이지에서 사용)
            if (result.order && result.orderData) {
              const confirmedOrderData = {
                id: result.order.orderId,
                items: result.orderData.orderItems?.map((item: any) => ({
                  productId: item.productId,
                  productName: item.name || "상품",
                  quantity: item.quantity || 1,
                  price: item.priceAtOrder !== undefined ? item.priceAtOrder : (result.orderData?.orderItems && result.orderData.orderItems.length > 0 ? amount / result.orderData.orderItems.length : amount)
                })) || [],
                totalAmount: result.order.amount || amount,
                status: "completed",
                paymentMethod: result.order.method || paymentType || "card",
                customerInfo: {
                  name: "고객님",
                  email: "customer@example.com",
                  phone: "010-0000-0000",
                  address: "서울특별시",
                },
                createdAt: result.order.approvedAt ? new Date(result.order.approvedAt) : new Date(),
              };
              
              sessionStorage.setItem('confirmedOrderData', JSON.stringify(confirmedOrderData));
              console.log("[결제완료] 확인된 주문 정보 저장:", confirmedOrderData);
            } else {
              console.warn("[결제완료] 백엔드에서 주문 정보를 제공하지 않음");
              
              // 백엔드에서 주문 정보를 제공하지 않는 경우 최소한의 정보만 저장
              const minimalOrderData = {
                id: orderId,
                items: [],
                totalAmount: amount,
                status: "completed",
                paymentMethod: paymentType || "card",
                customerInfo: {
                  name: "고객님",
                },
                createdAt: new Date(),
              };
              
              sessionStorage.setItem('confirmedOrderData', JSON.stringify(minimalOrderData));
            }
            
            // 장바구니 비우기
            clearCart();
            
            // 성공 메시지 표시
            toast({
              title: "결제가 완료되었습니다",
              description: `주문번호: ${orderId.substring(0, 12)}...`,
              duration: 3000
            });
            
            // 결제 완료 페이지로 이동
            setTimeout(() => {
              const successUrl = `/checkout/success?orderId=${orderId}&storeId=${effectiveStoreId}`;
              console.log("[결제완료] 결제 완료 페이지로 이동:", successUrl);
              window.location.href = successUrl;
            }, 1000);
          } else {
            // 백엔드에서 성공은 했지만 결과가 실패인 경우
            console.error("[결제완료] 백엔드에서 결제 확인 실패 응답:", result.message);
            
            // 장바구니 비우기
            clearCart();
            
            // 실패 메시지 표시
            toast({
              title: "결제 처리 중 오류가 발생했습니다",
              description: result.message || "결제 확인 실패",
              variant: "destructive",
              duration: 3000
            });
            
            // 실패 페이지로 리다이렉트
            setTimeout(() => {
              const failUrl = `/checkout/failed?orderId=${orderId}&storeId=${effectiveStoreId}&message=${encodeURIComponent(result.message || "결제 확인 실패")}&error=PAYMENT_FAILED`;
              console.log("[결제완료] 결제 실패 페이지로 이동:", failUrl);
              window.location.href = failUrl;
            }, 1500);
          }
        } catch (error) {
          // 네트워크 오류 등의 예외 처리
          console.error("[결제완료] 결제 확인 중 오류 발생:", error);
          handlePaymentError(error);
        } finally {
          setIsProcessing(false);
        }
      })();
    } else if (searchParams.has("orderId")) {
      // orderId는 있지만 paymentKey가 없는 경우 (실패 리다이렉트 또는 잘못된 접근)
      console.log("[결제완료] orderId는 있지만 paymentKey가 없음 - 결제 실패 또는 잘못된 접근");
      
      // 3초 후 결제 실패 페이지로 리다이렉트
      if (!isPaymentSuccess) {
        toast({
          title: "결제 진행 중 오류가 발생했습니다",
          description: "결제가 완료되지 않았습니다. 다시 시도해주세요.",
          variant: "destructive",
          duration: 3000
        });
        
        setTimeout(() => {
          if (storeId) {
            window.location.href = `/checkout/failed?storeId=${storeId}`;
          } else {
            window.location.href = `/checkout/failed`;
          }
        }, 3000);
      }
    }
  }, [searchParams, isPaymentSuccess, storeId, clearCart, toast]);
  
  // 결제 오류 처리 통합 함수
  const handlePaymentError = (error: any) => {
    console.error("[결제완료] 결제 확인 실패:", error);
    
    // 에러 메시지 표시
    toast({
      title: "결제 확인 중 문제가 발생했습니다",
      description: error?.message || "알 수 없는 오류가 발생했습니다. 고객센터로 문의해주세요.",
      variant: "destructive",
      duration: 5000
    });
    
    // 주문 ID에서 storeId 추출
    const orderId = searchParams.get("orderId") || "";
    let storeIdFromOrderId = "";
    if (orderId) {
      const orderIdParts = orderId.split('_');
      if (orderIdParts.length >= 3) {
        storeIdFromOrderId = orderIdParts[1];
      }
    }
    
    // storeId 결정
    const effectiveStoreId = storeId || storeIdFromOrderId || "";
    
    // 임시 주문 정보 생성 (결제 완료 페이지에서 최소한의 정보 표시용)
    const tempAmount = Number(searchParams.get("amount")) || 0;
    const tempOrderData = {
      id: orderId,
      items: [{
        productId: "temp-product-id",
        productName: "주문 상품",
        quantity: 1,
        price: tempAmount,
      }],
      totalAmount: tempAmount,
      status: "failed",
      paymentMethod: searchParams.get("paymentType") || "card",
      customerInfo: {
        name: "고객님",
        email: "customer@example.com",
        phone: "010-0000-0000",
        address: "서울특별시",
      },
      createdAt: new Date(),
    };
    
    // 세션 스토리지에 임시 정보 저장
    sessionStorage.setItem('confirmedOrderData', JSON.stringify(tempOrderData));
    console.log("[결제완료] 오류 발생으로 임시 주문 정보 저장:", tempOrderData);
    
    // 장바구니 비우기
    clearCart();
    
    // 결제 실패 페이지로 이동
    setTimeout(() => {
      if (orderId) {
        const failUrl = `/checkout/failed?orderId=${orderId}&storeId=${effectiveStoreId}&message=${encodeURIComponent(error?.message || "결제 확인 실패")}&error=PAYMENT_FAILED`;
        console.log("[결제완료] 결제 실패 페이지로 이동:", failUrl);
        
        try {
          // 브라우저 히스토리 대체 (뒤로가기로 돌아오지 않도록)
          if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', failUrl);
            window.location.reload();
          } else {
            // Next.js router 사용
            router.replace(failUrl);
          }
        } catch (e) {
          console.error("[DEBUG] 리다이렉트 실패:", e);
          // 마지막 수단
          window.location.href = failUrl;
        }
      } else {
        console.log("[결제완료] 주문 ID 없음. 장바구니 페이지로 이동");
        window.location.href = storeId ? `/cart?storeId=${storeId}` : "/cart";
      }
    }, 3000);
  };
  
  const handleScriptLoad = () => {
    console.log("[DEBUG] 토스페이먼츠 스크립트 로드 완료. window.PaymentWidget:", window.PaymentWidget);
    if (window.PaymentWidget) {
      // 스크립트 로드 후 customerKey가 준비되었는지 확인하고 위젯 초기화
      if (customerKeyRef.current && items.length > 0 && storeId) {
         console.log("[DEBUG] 스크립트 로드 완료 후 조건 충족, 위젯 즉시 초기화 시도.");
         initPaymentWidget();
      } else {
        console.log("[DEBUG] 스크립트 로드 완료되었으나, 위젯 즉시 초기화 조건 미충족 (customerKey, items, storeId).");
      }
    } else {
      console.error("[DEBUG] CRITICAL: 토스페이먼츠 스크립트는 로드되었으나 window.PaymentWidget이 정의되지 않음!");
      toast({ title: "결제 시스템 오류", description: "결제 모듈을 불러오는데 실패했습니다. 페이지를 새로고침 해주세요.", variant: "destructive" });
    }
  };

  const handleScriptError = (e: any) => {
    console.error("[DEBUG] CRITICAL: 토스페이먼츠 스크립트 로드 실패!", e);
    toast({
      title: "결제 시스템 로드 실패",
      description: "결제 시스템을 불러오지 못했습니다. 네트워크 연결을 확인하고 페이지를 새로고침 해주세요.",
      variant: "destructive",
      duration: 7000
    });
    // 필요한 경우, 여기에 추가적인 오류 처리 로직 (예: 사용자에게 다른 결제 방법 안내 등)
  };
  
  if (items.length === 0 && !isPaymentSuccess) {
    console.log("[DEBUG] 렌더링: 장바구니 비어있음 (결제 성공 아님). 리다이렉트 메시지 표시.");
    return <MobileLayout title="결제하기"><div className="p-4 text-center">장바구니가 비어있습니다. 장바구니 페이지로 이동합니다...</div></MobileLayout>;
  }
  
  const handlePaymentSuccess = async (paymentKey: string, orderId: string, amount: number) => {
    console.log("[결제] 결제 성공 처리 시작. 주문번호:", orderId, "금액:", amount);
    try {
      if (typeof toast !== 'function') {
        console.error("[결제] 심각: toast 함수가 유효하지 않습니다.", toast);
      }
      if (typeof clearCart !== 'function') {
        console.error("[결제] 심각: clearCart 함수가 유효하지 않습니다.", clearCart);
      }
      if (!router || typeof router.push !== 'function') {
        console.error("[결제] 심각: router.push 함수가 유효하지 않습니다.", router);
      }

      setIsProcessing(true);
      setIsPaymentSuccess(true); 
      

      const currentStoreId = storeId;
      
      console.log("[결제] 백엔드 결제 승인 요청 시작. 주문번호:", orderId, "storeId:", currentStoreId);
      
      const requestBody = { 
        paymentKey, 
        orderId, 
        amount, 
        storeId: currentStoreId || undefined
      };
      
      console.log("[결제] 백엔드 요청 데이터:", JSON.stringify(requestBody));
      
      try {
        // confirmPayment 함수 사용하여 백엔드 API 호출
        const result = await confirmPayment(requestBody);
        console.log("[결제] 백엔드 결제 승인 요청 성공:", result);

        if (result.success) {
          console.log("[결제] 💰💰💰 결제 성공! 주문번호:", orderId, "storeId:", currentStoreId);
          
          // 백엔드에서 반환한 결제 정보가 있으면 저장
          if (result.order) {
            console.log("[결제] 백엔드에서 반환한 주문 정보:", result.order);
            
            // 백엔드에서 받은 주문 정보를 세션 스토리지에 저장
            const confirmedOrderData = {
              items: result.orderData?.orderItems?.map((item: any) => ({
                productId: item.productId,
                productName: item.name || "상품",
                quantity: item.quantity || 1,
                price: item.priceAtOrder !== undefined ? item.priceAtOrder : (result.orderData?.orderItems && result.orderData.orderItems.length > 0 ? amount / result.orderData.orderItems.length : amount)
              })) || [],
              totalAmount: result.order.amount || amount,
              status: "completed",
              paymentMethod: (result.order && typeof result.order === 'object' && result.order !== null && 'method' in result.order && typeof (result.order as any).method === 'string') ? (result.order as any).method : "card",
              createdAt: result.order.approvedAt || new Date().toISOString(),
              storeId: currentStoreId
            };
            
            // 세션 스토리지에 저장 (로컬 스토리지보다 안전)
            sessionStorage.setItem('confirmedOrderData', JSON.stringify(confirmedOrderData));
            console.log("[결제] 주문 정보를 세션 스토리지에 저장:", confirmedOrderData);
          } else {
            // 백엔드에서 주문 정보가 없는 경우 카트 정보로 생성
            const fallbackOrderData = {
              items: items.map(item => ({
                productId: item.product.id,
                productName: item.product.name,
                quantity: item.quantity,
                price: item.product.price
              })),
              totalAmount: amount,
              paymentMethod: (result.order && typeof result.order === 'object' && result.order !== null && 'method' in result.order && typeof (result.order as any).method === 'string') ? (result.order as any).method : "card",
              createdAt: new Date().toISOString(),
              storeId: currentStoreId
            };
            
            sessionStorage.setItem('confirmedOrderData', JSON.stringify(fallbackOrderData));
            console.log("[결제] 백엔드 정보 없음, 카트 기반 임시 정보 저장:", fallbackOrderData);
          }
          
          toast?.({ 
            title: "결제가 완료되었습니다", 
            description: `주문번호: ${orderId.substring(0, 8)}`, 
            duration: 5000 
          });
          clearCart?.();
          
          // 결제 성공 시 storeId와 함께 성공 페이지로 리다이렉트
          const successUrl = `/checkout/success?orderId=${orderId}&storeId=${currentStoreId}`;
          console.log("[결제] 결제 성공 페이지로 리다이렉트:", successUrl);
          
          // 약간의 딜레이 후 리다이렉트 (토스트 메시지가 표시될 시간 확보)
          setTimeout(() => {
            console.log("[결제] 결제 성공 페이지로 이동합니다.");
            window.location.href = successUrl;
          }, 1000); // 1초로 늘림
        } else {
          throw new Error(result.message || "백엔드에서 결제 승인 실패 응답");
        }
      } catch (error: any) {
        console.error("[결제] 백엔드 API 호출 중 오류:", error.message, error.stack);
        
        // 장바구니 비우기
        clearCart?.();
        
        // 실패 정보 저장
        const failedOrderData = {
          id: orderId,
          items: items.map(item => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.product.price
          })),
          totalAmount: amount,
          status: "failed",
          paymentMethod: "card",
          createdAt: new Date().toISOString(),
          storeId: currentStoreId,
          failReason: error.message || "백엔드 결제 승인 실패"
        };
        
        // 세션 스토리지에 실패 정보 저장
        sessionStorage.setItem('confirmedOrderData', JSON.stringify(failedOrderData));
        
        // 토스트 메시지 표시
        toast?.({ 
          title: "결제 확인 중 오류가 발생했습니다", 
          description: error.message || "백엔드에서 결제 확인을 처리하지 못했습니다.",
          variant: "destructive",
          duration: 5000
        });
        
        // 실패 페이지로 리다이렉트
        setTimeout(() => {
          const failUrl = `/checkout/failed?orderId=${orderId}&storeId=${currentStoreId}&message=${encodeURIComponent(error.message || "결제 처리 중 오류")}&error=${error.code || "PAYMENT_FAILED"}`;
          console.log("[DEBUG] 결제 실패 페이지로 이동:", failUrl);
          
          try {
            // 브라우저 히스토리 대체 (뒤로가기로 돌아오지 않도록)
            if (typeof window !== 'undefined') {
              window.history.replaceState(null, '', failUrl);
              window.location.reload();
            } else {
              // Next.js router 사용
              router.replace(failUrl);
            }
          } catch (e) {
            console.error("[DEBUG] 리다이렉트 실패:", e);
            // 마지막 수단
            window.location.href = failUrl;
          }
        }, 1000);
        
        throw error; // 호출자에게 오류 전달
      }
    } catch (error: any) {
      console.error("[결제] 결제 처리 중 오류 발생:", error.message, error.stack);
      toast?.({ 
        title: "결제 처리 중 오류", 
        description: error.message || "알 수 없는 오류가 발생했습니다.", 
        variant: "destructive",
        duration: 5000
      });
      throw error; // 호출자에게 오류 전달
    } finally {
      console.log("[결제] 결제 처리 완료.");
      setIsProcessing(false);
    }
  };
  
  const handlePaymentRequest = async () => {
    if (isProcessing) {
      console.log("[DEBUG] 이미 결제 처리 중입니다. 중복 요청 방지.");
      return;
    }
    
    if (items.length === 0) {
      console.log("[DEBUG] 장바구니가 비어있습니다. 결제 요청 중단.");
      toast({
        title: "장바구니가 비어있습니다",
        description: "결제할 상품이 없습니다.",
        variant: "destructive",
      });
      return;
    }
    
    if (!paymentWidgetLoaded) {
      const isInitialized = initPaymentWidget();
      if (!isInitialized) {
        console.log("[DEBUG] 결제 위젯 초기화 실패. 결제 요청 중단.");
        toast({
          title: "결제 시스템 초기화 실패",
          description: "페이지를 새로고침한 후 다시 시도해주세요.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsProcessing(true);
    
    try {
      console.log("[DEBUG] 결제 요청 시작. 장바구니 상품:", items.length, "개");
      
      // 1. 주문 초기화 (백엔드 API 호출)
      // 상점 ID가 있는지 확인
      if (!storeId) {
        throw new Error("상점 ID가 없습니다.");
      }
      
      console.log("[DEBUG] 주문 초기화 요청 준비. storeId:", storeId);
      
      // 백엔드에 주문 정보 생성 요청
      const orderItems = items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }));
      
      console.log("[DEBUG] 백엔드 주문 초기화 요청 데이터:", { storeId, orderItems });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storeId, orderItems }),
      });
      
      console.log("[DEBUG] 주문 초기화 응답 상태:", response.status, response.statusText);
      
      if (!response.ok) {
        let errorMessage = "주문 초기화 중 오류가 발생했습니다.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error("[DEBUG] 주문 초기화 오류 응답:", errorData);
        } catch (e) {
          console.error("[DEBUG] 주문 초기화 오류 응답 파싱 실패:", e);
        }
        throw new Error(errorMessage);
      }
      
      const initialOrderData = await response.json();
      console.log("[DEBUG] 주문 초기화 성공:", initialOrderData);
      
      // 2. 토스페이먼츠 결제 위젯 요청 처리
      if (!window.paymentWidget) {
        console.error("[DEBUG] 결제 위젯이 초기화되지 않았습니다.");
        throw new Error("결제 시스템이 초기화되지 않았습니다. 페이지를 새로고침하고 다시 시도해주세요.");
      }
      
      // 결제 요청 URL 생성
      const successUrl = `${window.location.origin}/checkout/toss?storeId=${storeId}`;
      const failUrl = `${window.location.origin}/checkout/failed?storeId=${storeId}`;
      
      console.log("[DEBUG] 결제 성공 리다이렉트 URL:", successUrl);
      console.log("[DEBUG] 결제 실패 리다이렉트 URL:", failUrl);
      
      // 결제 요청 (토스페이먼츠 위젯)
      console.log("[DEBUG] 토스페이먼츠 결제 요청 준비:", {
        orderId: initialOrderData.orderId,
        orderName: initialOrderData.orderName,
        amount: initialOrderData.amount,
        customerName: "고객님",
        customerEmail: "",
        successUrl,
        failUrl
      });
      
      try {
        // 공식 문서에 따른 결제 요청
        const paymentResult = await window.paymentWidget.requestPayment({
          orderId: initialOrderData.orderId,
          orderName: initialOrderData.orderName,
          customerName: "고객님",
          customerEmail: "",
          successUrl: successUrl,
          failUrl: failUrl,
          // 가상계좌 추가 파라미터 (선택적)
          // virtualAccountCallbackUrl: `${window.location.origin}/api/virtual-account/callback`,
        });
        
        console.log("[DEBUG] 토스페이먼츠 결제 요청 성공:", paymentResult);
      } catch (error: any) {
        console.error("[DEBUG] 토스페이먼츠 결제 요청 오류:", error);
        
        // 백엔드 API를 통해 주문 취소 처리
        try {
          if (initialOrderData.orderId) {
            console.log("[DEBUG] 결제 취소/실패로 인한 주문 취소 API 호출");
            const cancelResult = await cancelOrder({
              orderId: initialOrderData.orderId,
              storeId: storeId || '',
              reason: error.code === "USER_CANCEL" ? "사용자에 의한 결제 취소" : `결제 오류: ${error.message || error.code || "알 수 없는 오류"}`
            });
            console.log("[DEBUG] 주문 취소 API 응답:", cancelResult);
          }
        } catch (cancelError) {
          console.error("[DEBUG] 주문 취소 API 호출 실패:", cancelError);
        }
        
                 // 에러 코드에 따른 처리
        console.log("[DEBUG] 토스페이먼츠 에러 코드:", error.code);
        
        // 에러 메시지 타입 정의
        type ErrorInfo = {
          title: string;
          description: string;
          variant?: "default" | "destructive";
          redirect: boolean;
        };
        
        // 간단한 사용자 입력 오류는 현재 페이지에서 안내
        const simpleUserErrors: Record<string, ErrorInfo> = {
          "USER_CANCEL": {
            title: "결제가 취소되었습니다",
            description: "사용자에 의해 결제가 취소되었습니다.",
            variant: "default",
            redirect: false
          },
          "INVALID_CARD_COMPANY": {
            title: "유효하지 않은 카드사입니다",
            description: "다른 카드로 결제를 시도해주세요.",
            variant: "destructive",
            redirect: false
          },
          "INVALID_CARD_INFO": {
            title: "카드 정보가 올바르지 않습니다",
            description: "카드 정보를 다시 확인해주세요.",
            variant: "destructive",
            redirect: false
          },
          "PAYMENT_METHOD_NOT_SELECTED": {
            title: "결제 수단이 선택되지 않았습니다",
            description: "결제 수단을 선택한 후 다시 시도해주세요.",
            variant: "destructive",
            redirect: false
          },
          "NO_PAYMENT_METHOD": {
            title: "결제 수단이 선택되지 않았습니다",
            description: "카드사를 선택한 후 다시 시도해주세요.",
            variant: "destructive",
            redirect: false
          },
          "CARD_COMPANY_NOT_SELECTED": {
            title: "카드사가 선택되지 않았습니다",
            description: "카드사를 선택한 후 다시 시도해주세요.",
            variant: "destructive",
            redirect: false
          },
          "PAY_METHOD_ERROR": {
            title: "결제 수단 오류",
            description: "결제 수단을 다시 선택해주세요.",
            variant: "destructive",
            redirect: false
          },
          "NEED_CARD_PAYMENT_DETAIL": {
            title: "카드 결제 정보 필요",
            description: "카드 결제 정보를 선택해주세요.",
            variant: "destructive",
            redirect: false
          }
        };
        
        // 심각한 결제 오류는 실패 페이지로 리다이렉트
        const criticalErrors: Record<string, ErrorInfo> = {
          "EXCEED_MAX_PAYMENT_AMOUNT": {
            title: "결제 한도 초과",
            description: "결제 금액이 한도를 초과했습니다.",
            variant: "destructive",
            redirect: true
          },
          "INVALID_CARD_NUM": {
            title: "유효하지 않은 카드번호",
            description: "카드 번호를 확인해주세요.",
            variant: "destructive",
            redirect: true
          },
          "DECLINED_PAYMENT": {
            title: "결제가 거부되었습니다",
            description: "카드사에서 결제를 거부했습니다. 다른 카드로 시도해주세요.",
            variant: "destructive",
            redirect: true
          },
          "UNAUTHORIZED_KEY": {
            title: "인증 오류",
            description: "결제 시스템 인증에 실패했습니다.",
            variant: "destructive",
            redirect: true
          },
          "INVALID_API_KEY": {
            title: "API 키 오류",
            description: "결제 시스템 설정에 문제가 있습니다.",
            variant: "destructive",
            redirect: true
          }
        };
        
        // 에러 코드에 따른 처리
        const errorInfo = simpleUserErrors[error.code as keyof typeof simpleUserErrors] || 
                         criticalErrors[error.code as keyof typeof criticalErrors];
        
        if (errorInfo) {
          // 토스트 메시지 표시
          toast({
            title: errorInfo.title,
            description: errorInfo.description,
            variant: errorInfo.variant || "destructive",
            duration: 5000,
          });
          
          // 리다이렉트가 필요한 경우에만 실패 페이지로 이동
          if (errorInfo.redirect) {
            setTimeout(() => {
              const failUrl = `/checkout/failed?orderId=${initialOrderData.orderId}&storeId=${storeId}&message=${encodeURIComponent(errorInfo.description)}&error=${error.code}`;
              console.log("[DEBUG] 결제 실패 페이지로 이동:", failUrl);
              
              try {
                // 브라우저 히스토리 대체 (뒤로가기로 돌아오지 않도록)
                if (typeof window !== 'undefined') {
                  window.history.replaceState(null, '', failUrl);
                  window.location.reload();
                } else {
                  router.replace(failUrl);
                }
              } catch (e) {
                console.error("[DEBUG] 리다이렉트 실패:", e);
                window.location.href = failUrl;
              }
            }, 1000);
          } else if (error.code === "USER_CANCEL") {
            // 사용자 취소 시 장바구니 페이지로 돌아가기
            setTimeout(() => {
              router.push(storeId ? `/cart?storeId=${storeId}` : "/cart");
            }, 1000);
          }
        } else {
          // 알 수 없는 오류는 실패 페이지로 리다이렉트
          toast({
            title: "결제 처리 중 오류가 발생했습니다",
            description: error.message || "다시 시도해주세요.",
            variant: "destructive",
            duration: 5000,
          });
          
          setTimeout(() => {
            const failUrl = `/checkout/failed?orderId=${initialOrderData.orderId}&storeId=${storeId}&message=${encodeURIComponent(error.message || "결제 처리 중 오류")}&error=${error.code || "PAYMENT_FAILED"}`;
            console.log("[DEBUG] 결제 실패 페이지로 이동:", failUrl);
            
            try {
              if (typeof window !== 'undefined') {
                window.history.replaceState(null, '', failUrl);
                window.location.reload();
              } else {
                router.replace(failUrl);
              }
            } catch (e) {
              console.error("[DEBUG] 리다이렉트 실패:", e);
              window.location.href = failUrl;
            }
          }, 1000);
        }
        
        throw error;
      }
    } catch (error) {
      console.error("[DEBUG] 결제 요청 중 오류 발생:", error);
      // 오류 처리는 위에서 이미 처리됨
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <>
      <Script
        src="https://js.tosspayments.com/v1/payment-widget"
        onLoad={handleScriptLoad}
        onError={handleScriptError}
        strategy="afterInteractive"
      />
      <MobileLayout 
        title="결제하기" 
        showBackButton={true} 
        backUrl={storeId ? `/cart?storeId=${storeId}` : "/cart"}
        storeId={storeId || undefined}
      >
        <div className="flex flex-col pb-32">
          <div className="p-4 space-y-6">
            <div className="space-y-4">
              <h2 className="text-lg font-bold">주문 상품</h2>
              <div className="space-y-3 border rounded-lg p-3">
                {items.map((item) => {
                  // 이용 불가능한 상품인지 확인
                  const isUnavailable = unavailableProducts.some((name: string) => 
                    item.product.name.toLowerCase().includes(name.toLowerCase()) || 
                    name.toLowerCase().includes(item.product.name.toLowerCase())
                  );
                  
                  return (
                    <div 
                      key={item.product.id} 
                      className={`flex justify-between items-center py-2 border-b last:border-b-0 ${isUnavailable ? 'opacity-60' : ''}`}
                    >
                      <div>
                        <div className="flex items-center">
                          <p className="text-base font-semibold">{item.product.name}</p>
                          {isUnavailable && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 bg-red-100 text-red-800 rounded-sm">
                              품절
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity}개 x {formatPrice(item.product.price)}
                        </p>
                      </div>
                      <p className="text-base font-bold">{formatPrice(item.product.price * item.quantity)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-bold">결제 수단</h2>
              <div id="payment-widget" className="border rounded-lg p-3 min-h-[200px] flex items-center justify-center">
                {!paymentWidgetLoaded && (
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm mb-2">결제 위젯 로딩 중...</p>
                    <Button variant="outline" size="sm" onClick={() => {
                       console.log("[DEBUG] '위젯 로딩 재시도' 버튼 클릭됨");
                       initPaymentWidget();
                    }}>
                      위젯 로딩 재시도
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium">총 결제 금액</span>
              <span className="text-lg font-bold">{formatPrice(totalPrice())}</span>
            </div>
            
            {unavailableProducts.length > 0 ? (
              <Button
                variant="destructive"
                onClick={() => {
                  // 이용 불가능한 상품 찾기
                  const unavailableItems = items.filter(item => 
                    unavailableProducts.some((name: string) => 
                      item.product.name.toLowerCase().includes(name.toLowerCase()) || 
                      name.toLowerCase().includes(item.product.name.toLowerCase())
                    )
                  );
                  
                  // 이용 불가능한 상품 장바구니에서 제거
                  unavailableItems.forEach(item => removeFromCart(item.product.id));
                  toast({ 
                    title: "품절 상품이 제거되었습니다", 
                    description: "품절된 상품이 장바구니에서 제거되었습니다. 다시 결제를 시도해주세요."
                  });
                  setUnavailableProducts([]);
                }}
                className="w-full"
              >
                품절 상품 제거하고 다시 시도
              </Button>
            ) : (
              <Button
                onClick={handlePaymentRequest}
                disabled={isProcessing || !paymentWidgetLoaded}
                className="w-full"
              >
                {isProcessing ? "처리 중..." : "결제하기"}
              </Button>
            )}
          </div>
        </div>
      </MobileLayout>
    </>
  );
}

export default function TossPaymentPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <TossPaymentContent />
    </Suspense>
  );
} 