export interface TossPaymentSuccessResponse {
    mId?: string;
    version?: string;
    paymentKey: string;
    orderId: string;
    orderName?: string;
    currency?: string;
    method?: string;
    totalAmount: number;
    balanceAmount?: number;
    status: 'DONE' | 'WAITING_FOR_DEPOSIT' | 'CANCELED' | 'PARTIAL_CANCELED' | 'ABORTED' | 'EXPIRED';
    requestedAt?: string;
    approvedAt?: string;
    transactionId?: string;
    receipt?: {
        url: string;
    };
    failure?: TossPaymentFailureResponse | null;
    card?: any;
    virtualAccount?: any;
}
export interface TossPaymentFailureResponse {
    code: string;
    message: string;
}
export type TossApiResponse<T = TossPaymentSuccessResponse | TossPaymentFailureResponse> = T;
