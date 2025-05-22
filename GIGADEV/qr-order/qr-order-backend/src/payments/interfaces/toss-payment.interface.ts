export interface TossPaymentSuccessResponse {
  mId?: string;
  version?: string;
  paymentKey: string;
  orderId: string;
  orderName?: string;
  currency?: string;
  method?: string; // "카드", "가상계좌" 등
  totalAmount: number;
  balanceAmount?: number;
  status: 'DONE' | 'WAITING_FOR_DEPOSIT' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED'; // 실제 가능한 모든 상태 포함 필요
  requestedAt?: string; // ISO 8601 형식
  approvedAt?: string; // ISO 8601 형식, 결제 완료 시
  transactionId?: string;
  receipt?: {
    url: string;
  };
  failure?: TossPaymentFailureResponse | null; // 실패 정보 (status가 DONE이 아닐 때)
  // ... 기타 카드, 가상계좌, 상품권 등에 따른 추가 필드들
  card?: any; // 예시: 실제 카드 정보 객체 타입 정의 필요
  virtualAccount?: any; // 예시
}

export interface TossPaymentFailureResponse {
  code: string;
  message: string;
}

// API 호출 시 응답을 위한 일반적인 인터페이스 (AxiosResponse<T>의 data 필드에 해당)
export type TossApiResponse<T = TossPaymentSuccessResponse | TossPaymentFailureResponse> = T;
