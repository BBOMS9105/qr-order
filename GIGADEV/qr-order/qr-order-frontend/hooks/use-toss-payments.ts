"use client";

import { useEffect, useState } from "react";

// 토스페이먼츠 웹 SDK의 타입 정의
declare global {
  interface Window {
    TossPayments?: any;
  }
}

export function useTossPayments(clientKey: string) {
  const [tossPayments, setTossPayments] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1/payment-widget";
    script.async = true;
    
    script.onload = () => {
      if (window.TossPayments) {
        try {
          const tossInstance = window.TossPayments(clientKey);
          setTossPayments(tossInstance);
          setIsLoading(false);
        } catch (err) {
          setError(err instanceof Error ? err : new Error("토스페이먼츠 초기화 중 오류가 발생했습니다."));
          setIsLoading(false);
        }
      }
    };
    
    script.onerror = () => {
      setError(new Error("토스페이먼츠 스크립트 로드 중 오류가 발생했습니다."));
      setIsLoading(false);
    };
    
    document.body.appendChild(script);
    
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [clientKey]);

  return { tossPayments, isLoading, error };
} 