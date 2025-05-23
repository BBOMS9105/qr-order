"use server"

import { revalidatePath } from "next/cache"
import type { Product, Order, OrderItem } from "./types"
import { v4 as uuidv4 } from "uuid"
import { unstable_cache } from "next/cache"

// 서버에 저장된 상품 데이터 (실제로는 데이터베이스를 사용해야 함)
let products: Product[] = [
  {
    id: "1",
    name: "스마트폰",
    description: "최신 스마트폰입니다. 고성능 카메라와 긴 배터리 수명을 자랑합니다.",
    price: 1000000,
    image: "/placeholder.svg?height=300&width=300",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    name: "노트북",
    description: "가벼운 노트북입니다. 업무와 학습에 적합합니다.",
    price: 1500000,
    image: "/placeholder.svg?height=300&width=300",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "3",
    name: "무선 이어폰",
    description: "고음질 무선 이어폰입니다. 노이즈 캔슬링 기능이 있습니다.",
    price: 200000,
    image: "/placeholder.svg?height=300&width=300",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// 주문 데이터 (실제로는 데이터베이스를 사용해야 함)
const orders: Order[] = []

// 이미지 저장소 (실제로는 클라우드 스토리지를 사용해야 함)
const imageStorage: Record<string, string> = {}

// Next.js 15에서는 기본적으로 캐시되지 않으므로 명시적으로 캐시 설정
export const getProducts = unstable_cache(
  async () => {
    return products
  },
  ["products-list"],
  { revalidate: 60 }, // 60초마다 재검증
)

// 상품 상세 조회 - 캐시 적용
export const getProduct = unstable_cache(
  async (id: string) => {
    return products.find((product) => product.id === id)
  },
  ["product-detail"],
  { revalidate: 60 },
)

// 특정 스토어의 상품 조회 - 캐시 적용
export const getProductsByStore = async (storeId: string) => {
  try { 
    // 백엔드 API 서버 주소 (환경변수 또는 하드코딩)
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.0.78:3002';
    console.log(`[API 호출] 스토어 ID ${storeId}의 상품 조회 중...`);
    
    const response = await fetch(`${apiUrl}/payments/products/store/${storeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // 캐싱 방지
      next: { revalidate: 0 } // 항상 최신 데이터 가져오기
    });
    
    if (!response.ok) {
      console.error(`API 오류: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`[API 응답] ${data.length}개 상품 데이터 수신`);
    return data;
  } catch (error) {
    console.error("스토어 상품 조회 오류:", error);
    return [];
  }
}

// 이미지 업로드 처리
export async function uploadImage(formData: FormData) {
  try {
    const file = formData.get("file") as File

    if (!file) {
      return { success: false, message: "파일이 없습니다." }
    }

    // 파일 타입 검증
    if (!file.type.startsWith("image/")) {
      return { success: false, message: "이미지 파일만 업로드 가능합니다." }
    }

    // 파일 크기 검증 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, message: "파일 크기는 5MB 이하여야 합니다." }
    }

    // 실제 환경에서는 여기서 클라우드 스토리지에 업로드
    // 이 예제에서는 메모리에 저장하고 가상 URL 생성
    const fileId = uuidv4()
    const fileExtension = file.name.split(".").pop() || "jpg"
    const imageUrl = `/uploads/${fileId}.${fileExtension}`

    // 파일 데이터를 Base64로 변환 (실제로는 스토리지에 업로드)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString("base64")

    // 메모리에 저장 (실제로는 클라우드 스토리지에 저장)
    imageStorage[imageUrl] = `data:${file.type};base64,${base64}`

    return {
      success: true,
      imageUrl,
      message: "이미지가 성공적으로 업로드되었습니다.",
    }
  } catch (error) {
    console.error("Image upload error:", error)
    return {
      success: false,
      message: "이미지 업로드 중 오류가 발생했습니다.",
    }
  }
}

// 이미지 URL로 이미지 데이터 가져오기
export async function getImageData(imageUrl: string) {
  // 기본 이미지인 경우 그대로 반환
  if (imageUrl.startsWith("/placeholder.svg")) {
    return imageUrl
  }

  // 업로드된 이미지인 경우 저장소에서 데이터 반환
  return imageStorage[imageUrl] || null
}

// 상품 추가
export async function addProduct(formData: FormData, storeId?: string) {
  try {
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const priceStr = formData.get("price") as string
    const price = Number.parseInt(priceStr, 10) // 문자열을 숫자로 변환
    const image = (formData.get("image") as string) || "/placeholder.svg?height=300&width=300"

    // 필수 필드 검증
    if (!name || isNaN(price)) {
      return { success: false, message: "필수 필드가 누락되었습니다." }
    }
    
    // storeId가 제공된 경우 백엔드 API 호출
    if (storeId) {
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.0.78:3002';
      console.log(`[API 호출] 스토어 ID ${storeId}의 상품 추가 중...`);
      
      const productData = {
        name,
        description,
        price,
        image,
        storeId
      };
      
      const response = await fetch(`${apiUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        console.error(`API 오류: ${response.status} ${response.statusText}`);
        return { success: false, message: "상품 추가 중 오류가 발생했습니다." };
      }
      
      const result = await response.json();
      
      // Next.js 15에서는 태그 기반 재검증 사용
      revalidatePath("/", "layout")
      revalidatePath("/admin", "layout")
      
      return { success: true, product: result };
    }
    
    // 로컬 구현 (storeId가 없는 경우)
    const newProduct: Product = {
      id: uuidv4(),
      name,
      description,
      price,
      image,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    products.push(newProduct)

    // Next.js 15에서는 태그 기반 재검증 사용
    revalidatePath("/", "layout")
    revalidatePath("/admin", "layout")

    return { success: true, product: newProduct }
  } catch (error) {
    console.error("상품 추가 오류:", error);
    return { success: false, message: "상품 추가 중 오류가 발생했습니다." };
  }
}

// 상품 수정
export async function updateProduct(formData: FormData, storeId?: string) {
  try {
    const id = formData.get("id") as string
    const name = formData.get("name") as string
    const description = formData.get("description") as string
    const priceStr = formData.get("price") as string
    const price = Number.parseInt(priceStr, 10) // 문자열을 숫자로 변환
    const image = formData.get("image") as string

    // 가격이 0이어도 유효한 값으로 처리
    if (!id || !name || isNaN(price)) {
      return { success: false, message: "필수 필드가 누락되었습니다." }
    }

    // storeId가 제공된 경우 백엔드 API 호출
    if (storeId) {
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.0.78:3002';
      console.log(`[API 호출] 스토어 ID ${storeId}의 상품 ${id} 수정 중...`);
      
      const productData = {
        id,
        name,
        description,
        price,
        image,
        storeId
      };
      
      const response = await fetch(`${apiUrl}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData)
      });
      
      if (!response.ok) {
        console.error(`API 오류: ${response.status} ${response.statusText}`);
        return { success: false, message: "상품 수정 중 오류가 발생했습니다." };
      }
      
      const result = await response.json();
      
      // Next.js 15에서는 태그 기반 재검증 사용
      revalidatePath("/", "layout")
      revalidatePath("/admin", "layout")
      revalidatePath(`/product/${id}`, "layout")
      
      return { success: true, product: result };
    }
    
    // 로컬 구현 (storeId가 없는 경우)
    const productIndex = products.findIndex((product) => product.id === id)

    if (productIndex === -1) {
      return { success: false, message: "상품을 찾을 수 없습니다." }
    }

    products[productIndex] = {
      ...products[productIndex],
      name,
      description,
      price,
      image: image || products[productIndex].image,
      updatedAt: new Date(),
    }

    // Next.js 15에서는 태그 기반 재검증 사용
    revalidatePath("/", "layout")
    revalidatePath("/admin", "layout")
    revalidatePath(`/product/${id}`, "layout")

    return { success: true, product: products[productIndex] }
  } catch (error) {
    console.error("상품 수정 오류:", error);
    return { success: false, message: "상품 수정 중 오류가 발생했습니다." };
  }
}

// 상품 삭제
export async function deleteProduct(id: string, storeId?: string) {
  try {
    // storeId가 제공된 경우 백엔드 API를 호출
    if (storeId) {
      // 백엔드 API 서버 주소
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.0.78:3002';
      console.log(`[API 호출] 스토어 ID ${storeId}의 상품 ${id} 삭제 중...`);
      
      const response = await fetch(`${apiUrl}/products/${id}?storeId=${storeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`API 오류: ${response.status} ${response.statusText}`);
        return { success: false, message: "상품 삭제 중 오류가 발생했습니다." };
      }
      
      // Next.js 15에서는 태그 기반 재검증 사용
      revalidatePath("/", "layout")
      revalidatePath("/admin", "layout")
      
      return { success: true };
    }
    
    // 기존 로컬 구현 (storeId가 없는 경우)
    const initialLength = products.length
    products = products.filter((product) => product.id !== id)

    if (products.length === initialLength) {
      return { success: false, message: "상품을 찾을 수 없습니다." }
    }

    // Next.js 15에서는 태그 기반 재검증 사용
    revalidatePath("/", "layout")
    revalidatePath("/admin", "layout")

    return { success: true }
  } catch (error) {
    console.error("상품 삭제 오류:", error);
    return { success: false, message: "상품 삭제 중 오류가 발생했습니다." };
  }
}

// 주문 생성
export async function createOrder(orderData: {
  items: { productId: string; quantity: number }[]
  paymentMethod: string
  customerInfo: {
    name: string
    email: string
    phone: string
    address: string
  }
}) {
  try {
    // 주문 항목 생성
    const orderItems: OrderItem[] = orderData.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!

      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
      }
    })

    // 총 금액 계산
    const totalAmount = orderItems.reduce((total, item) => total + item.price * item.quantity, 0)

    // 주문 생성
    const order: Order = {
      id: uuidv4(),
      items: orderItems,
      totalAmount,
      status: "completed",
      paymentMethod: orderData.paymentMethod,
      customerInfo: orderData.customerInfo,
      createdAt: new Date(),
    }

    orders.push(order)

    // Next.js 15에서는 태그 기반 재검증 사용
    revalidatePath("/", "layout")
    revalidatePath("/shop", "layout")
    revalidatePath("/cart", "layout")
    revalidatePath("/checkout", "layout")

    // 결제 성공 시뮬레이션 (실제로는 결제 게이트웨이 연동 필요)
    // 테스트를 위해 가끔 실패하도록 설정 (10% 확률로 실패)
    const isPaymentSuccessful = Math.random() > 0.1

    if (isPaymentSuccessful) {
      return {
        success: true,
        order,
      }
    } else {
      return {
        success: false,
        error: "PAYMENT_FAILED",
        message: "결제 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
      }
    }
  } catch (error) {
    console.error("Order creation error:", error)
    return {
      success: false,
      error: "SERVER_ERROR",
      message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    }
  }
}

// 주문 조회 - 캐시 적용
export const getOrder = unstable_cache(
  async (id: string) => {
    try {
      console.log(`[주문 조회] 주문 ID ${id} 조회 중...`);
      
      // 백엔드 API 서버 주소 (환경변수 또는 하드코딩)
      const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.0.78:3002';
      
      // 주문 ID에서 storeId 추출 (order_storeId_timestamp_random 형식)
      const orderIdParts = id.split('_');
      const storeId = orderIdParts.length >= 3 ? orderIdParts[1] : '';
      
      if (!storeId) {
        console.error('[주문 조회] 주문 ID에서 storeId를 추출할 수 없습니다:', id);
        return null;
      }
      
      console.log(`[주문 조회] storeId: ${storeId}, orderId: ${id} 조회 요청 중...`);
      
      // 백엔드에서는 아직 /payments/orders/:orderId 엔드포인트가 구현되지 않았으므로
      // 프론트엔드 주문 정보 구조에 맞는 형태로 임시 변환하여 반환
      try {
        // 실제 주문 정보 가져오기 시도 (컨트롤러 구현 필요)
        const response = await fetch(`${apiUrl}/payments/orders/${id}?storeId=${storeId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store' // 캐싱 방지
        });
        
        if (response.ok) {
          const orderData = await response.json();
          console.log(`[주문 조회] 백엔드 API 응답:`, orderData);
          
          // API 응답 형식을 프론트엔드 주문 형식으로 변환
          const order = {
            id: orderData.orderId,
            items: orderData.orderItems.map((item: any) => ({
              productId: item.productId,
              productName: item.productName || item.name,
              quantity: item.quantity,
              price: item.priceAtOrder || item.price,
            })),
            totalAmount: orderData.amount,
            status: orderData.status === 'PAID' ? "completed" : orderData.status,
            paymentMethod: orderData.method || "card",
            customerInfo: orderData.customerInfo || {
              name: "고객님",
              email: "customer@example.com",
              phone: "010-0000-0000",
              address: "서울시",
            },
            createdAt: orderData.createdAt ? new Date(orderData.createdAt) : new Date(),
            updatedAt: orderData.updatedAt ? new Date(orderData.updatedAt) : new Date(),
          };
          
          return order;
        } else {
          console.error(`[주문 조회] 백엔드 API 오류 응답: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.error("[주문 조회] 백엔드 API 호출 실패:", error);
      }
      
      // 세션 스토리지에서 확인된 주문 정보가 있으면 사용
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          const confirmedDataStr = sessionStorage.getItem('confirmedOrderData');
          if (confirmedDataStr) {
            const confirmedData = JSON.parse(confirmedDataStr);
            console.log('[주문 조회] 세션 스토리지에서 확인된 주문 정보 사용:', confirmedData);
            
            if (!confirmedData.id) {
              confirmedData.id = id;
            }
            
            // 세션 스토리지 데이터에 필요한 필드가 있는지 확인하고 반환
            return {
              id: confirmedData.id || id,
              items: confirmedData.items || [],
              totalAmount: confirmedData.totalAmount || 0,
              status: confirmedData.status || "completed",
              paymentMethod: confirmedData.paymentMethod || "card",
              customerInfo: confirmedData.customerInfo || {
                name: "고객님",
                email: "customer@example.com",
                phone: "010-0000-0000",
                address: "서울시",
              },
              createdAt: confirmedData.createdAt ? new Date(confirmedData.createdAt) : new Date(),
            };
          }
        } catch (e) {
          console.error('[주문 조회] 세션 스토리지 데이터 파싱 오류:', e);
        }
      }
      
      console.error('[주문 조회] 주문 정보를 찾을 수 없음. 백엔드 API가 구현되어 있는지 확인하세요.');
      return null;
    } catch (error) {
      console.error("[주문 조회] 오류 발생:", error);
      return null;
    }
  },
  ["order-detail"],
  { revalidate: 10 }, // 10초마다 재검증으로 변경
)
