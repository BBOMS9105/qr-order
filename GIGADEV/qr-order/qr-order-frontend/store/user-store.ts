import { create } from "zustand"
import { persist } from "zustand/middleware"

export type UserRole = "customer" | "owner" | null

interface UserState {
  role: UserRole
  isAuthenticated: boolean
  password: string
  storeId: string | null
  setRole: (role: UserRole) => void
  authenticate: (password: string) => boolean
  logout: () => void
  setStoreId: (storeId: string) => void
}

// 실제 환경에서는 이 비밀번호를 서버에 저장하고 검증해야 합니다
const OWNER_PASSWORD = "shop1234"

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      role: null,
      isAuthenticated: false,
      password: OWNER_PASSWORD,
      storeId: null,
      setRole: (role) => set({ role }),
      authenticate: (password) => {
        const isValid = password === get().password
        if (isValid) {
          set({ isAuthenticated: true, role: "owner" }) // role도 함께 설정
        }
        return isValid
      },
      logout: () => set({ role: null, isAuthenticated: false }),
      setStoreId: (storeId) => set({ storeId }),
    }),
    {
      name: "user-storage",
    },
  ),
)
