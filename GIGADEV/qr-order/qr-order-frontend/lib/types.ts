export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  isAvailable?: boolean
  storeId?: string
  createdAt: Date
  updatedAt: Date
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  items: OrderItem[]
  totalAmount: number
  status: "pending" | "completed" | "cancelled"
  paymentMethod: string
  customerInfo: {
    name: string
    email: string
    phone: string
    address: string
  }
  createdAt: Date
}
