export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // 서버 측 모니터링 설정
    console.log("서버 측 모니터링 초기화됨")
  }

  // 클라이언트 측 모니터링은 여기서 설정하지 않음
}
