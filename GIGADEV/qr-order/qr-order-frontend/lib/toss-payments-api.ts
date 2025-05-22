"use client";

import { getBaseUrl } from "./utils";

interface InitiateOrderPayload {
  amount: number;
  orderName: string;
}

interface ConfirmPaymentPayload {
  paymentKey: string;
  orderId: string;
  amount: number;
  storeId?: string;
}

interface CancelOrderPayload {
  orderId: string;
  storeId: string;
  reason?: string;
}

export const initiateOrder = async (payload: InitiateOrderPayload): Promise<{
  orderId: string;
  orderName: string;
  amount: number;
}> => {
  const response = await fetch(`${getBaseUrl()}/api/payments/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "주문 초기화 중 오류가 발생했습니다.");
  }

  return response.json();
};

export const cancelOrder = async (payload: CancelOrderPayload): Promise<{
  success: boolean;
  message: string;
  order?: {
    orderId: string;
    status: string;
  };
}> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  console.log(`[주문 취소] API URL 확인: ${apiUrl}`);
  console.log(`[주문 취소] 백엔드 직접 호출: ${apiUrl}/payments/cancel`);
  console.log(`[주문 취소] 요청 데이터:`, payload);
  
  try {
    const response = await fetch(`${apiUrl}/payments/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(`[주문 취소] 응답 상태: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorMessage = "주문 취소 중 오류가 발생했습니다.";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error(`[주문 취소] 오류 응답:`, errorData);
      } catch (e) {
        console.error(`[주문 취소] 오류 응답 파싱 실패:`, e);
      }
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log(`[주문 취소] 성공 응답:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`[주문 취소] 요청 오류:`, error);
    throw error;
  }
};

export const confirmPayment = async (payload: ConfirmPaymentPayload): Promise<{
  success: boolean;
  message: string;
  order?: {
    orderId: string;
    amount: number;
    status: string;
    method: string;
    approvedAt: string;
    receiptUrl?: string;
  };
  orderData?: {
    orderId: string;
    orderItems: Array<{
      productId: string;
      quantity: number;
      priceAtOrder: number;
      name?: string;
    }>;
  };
}> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  console.log(`[결제 확인] API URL 확인: ${apiUrl}`);
  console.log(`[결제 확인] 백엔드 직접 호출: ${apiUrl}/payments/confirm`);
  console.log(`[결제 확인] 요청 데이터:`, payload);
  
  try {
    const response = await fetch(`${apiUrl}/payments/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(`[결제 확인] 응답 상태: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      let errorMessage = "결제 확인 중 오류가 발생했습니다.";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        console.error(`[결제 확인] 오류 응답:`, errorData);
      } catch (e) {
        console.error(`[결제 확인] 오류 응답 파싱 실패:`, e);
      }
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log(`[결제 확인] 성공 응답:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`[결제 확인] 요청 오류:`, error);
    throw error;
  }
}; 