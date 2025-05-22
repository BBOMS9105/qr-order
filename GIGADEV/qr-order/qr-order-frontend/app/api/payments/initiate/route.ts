import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { amount, orderName } = data;

    if (!amount || !orderName) {
      return NextResponse.json(
        { message: "amount와 orderName은 필수 값입니다." },
        { status: 400 }
      );
    }

    // 백엔드 API 호출
    const token = request.cookies.get("token")?.value; // 사용자 인증 토큰
    
    if (!token) {
      return NextResponse.json(
        { message: "인증 토큰이 없습니다. 로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/payments/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount, orderName }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { message: errorData.message || "결제 초기화 중 오류가 발생했습니다." },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("결제 초기화 중 오류:", error);
    return NextResponse.json(
      { message: "결제 초기화 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 