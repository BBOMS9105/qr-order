"use client"

import Link from "next/link"
import { ShoppingCart, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUserRole } from "@/context/user-role-context"
import { useCart } from "@/context/cart-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

export default function Header() {
  const { userRole, setUserRole } = useUserRole()
  const { totalItems } = useCart()

  return (
    <header className="border-b">
      <div className="container mx-auto py-4 px-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Simple E-commerce
        </Link>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">{userRole === "owner" ? "상점 주인" : "고객"}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setUserRole("owner")}>상점 주인으로 전환</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserRole("customer")}>고객으로 전환</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {userRole === "owner" ? (
            <Button variant="ghost" asChild>
              <Link href="/admin">
                <Package className="mr-2 h-5 w-5" />
                상품 관리
              </Link>
            </Button>
          ) : (
            <Button variant="ghost" asChild>
              <Link href="/cart" className="relative">
                <ShoppingCart className="mr-2 h-5 w-5" />
                장바구니
                {totalItems > 0 && (
                  <Badge variant="secondary" className="absolute -top-2 -right-2">
                    {totalItems}
                  </Badge>
                )}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
