# QR 주문 시스템 관리자용 API 설명서

## 개요
이 문서는 시스템 관리자(슈퍼 관리자)가 사용할 수 있는 API에 대한 설명서입니다.
주로 스토어 계정 생성 및 관리를 위한 엔드포인트를 포함합니다.

## 인증
일부 엔드포인트는 JWT 인증이 필요합니다. API 호출 시 `Authorization` 헤더에 `Bearer {액세스 토큰}`을 포함해야 합니다.

## 엔드포인트

### 1. 사용자 등록 API
스토어에 관리자 계정을 생성합니다.

**URL:** `POST /admin/users/register`  
**인증 필요:** 아니오 (시스템 관리자용)  
**요청 본문:**
```json
{
  "businessRegistrationNumber": "123-45-67890", // 사업자등록번호 (형식: xxx-xx-xxxxx)
  "password": "password123",                     // 비밀번호
  "name": "가게 관리자",                          // 관리자 이름 (선택사항)
  "phoneNumber": "010-1234-5678",               // 전화번호 (선택사항)
  "storeId": "스토어ID"                          // 연결할 스토어 ID
}
```

**응답:**
```json
{
  "message": "사용자가 성공적으로 등록되었습니다.",
  "user": {
    "id": "사용자ID",
    "businessRegistrationNumber": "123-45-67890",
    "name": "가게 관리자",
    "phoneNumber": "010-1234-5678",
    "storeId": "스토어ID",
    "createdAt": "2023-05-22T00:00:00.000Z",
    "updatedAt": "2023-05-22T00:00:00.000Z"
  }
}
```

### 2. 스토어 목록 조회 API
등록된 모든 스토어 목록을 조회합니다.

**URL:** `GET /admin/users/stores`  
**인증 필요:** 예 (관리자 JWT 토큰)  
**응답:**
```json
{
  "count": 2,
  "stores": [
    {
      "id": "스토어ID1",
      "name": "스토어1",
      "address": "서울시 강남구",
      "createdAt": "2023-05-22T00:00:00.000Z"
    },
    {
      "id": "스토어ID2",
      "name": "스토어2",
      "address": "서울시 서초구",
      "createdAt": "2023-05-21T00:00:00.000Z"
    }
  ]
}
```

### 3. 특정 스토어 조회 API
특정 스토어의 상세 정보를 조회합니다.

**URL:** `GET /admin/users/stores/{storeId}`  
**인증 필요:** 예 (관리자 JWT 토큰)  
**응답:**
```json
{
  "id": "스토어ID",
  "name": "스토어 이름",
  "address": "스토어 주소",
  "createdAt": "2023-05-22T00:00:00.000Z"
}
```

## 에러 응답
에러 발생 시 다음과 같은 형식으로 응답합니다:

```json
{
  "statusCode": 400, // HTTP 상태 코드
  "message": "에러 메시지",
  "error": "에러 타입"
}
```

## 참고 사항
- 모든 요청/응답은 `application/json` 형식입니다.
- 요청 본문의 유효성 검사는 서버 측에서 수행합니다.
- 하나의 스토어에는 하나의 관리자만 등록할 수 있습니다. 