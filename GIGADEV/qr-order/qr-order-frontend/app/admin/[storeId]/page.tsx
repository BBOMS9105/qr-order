"use client"

import React, { useEffect, useState } from "react"
import { getProductsByStore, deleteProduct } from "@/lib/actions"
import type { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useUserStore } from "@/store/user-store"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { PlusIcon, Pencil, Trash2 } from "lucide-react"
import MobileLayout from "@/components/mobile-layout"

// 리다이렉트 최대 허용 횟수
const MAX_REDIRECTS = 2;

export default function AdminStorePage({ params }: { params: Promise<{ storeId: string }> }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [redirectAttempted, setRedirectAttempted] = useState(false)
  const [redirectBlocked, setRedirectBlocked] = useState(false)
  const { toast } = useToast()
  const { isAuthenticated, storeId: savedStoreId } = useUserStore()
  const router = useRouter()
  
  // React.use()를 사용하여 params Promise 언랩
  const resolvedParams = React.use(params)
  const storeId = resolvedParams.storeId
  
  // 인증 상태 확인 및 상품 목록 로드
  useEffect(() => {
    let isMounted = true;
    
    // 방문 로그 출력
    console.log(`admin/${storeId} 페이지 방문: 인증상태=${isAuthenticated}, 리다이렉트시도=${redirectAttempted}`);
    
    // 리다이렉트 카운터 관리
    let redirectCount = 0;
    try {
      const storedCount = localStorage.getItem('redirect_count');
      redirectCount = storedCount ? parseInt(storedCount, 10) : 0;
      
      // 리다이렉트 카운터 증가 및 저장
      redirectCount++;
      localStorage.setItem('redirect_count', redirectCount.toString());
      
      console.log(`리다이렉트 카운트: ${redirectCount}/${MAX_REDIRECTS}`);
      
      // 최대 리다이렉트 횟수 초과 시 중단
      if (redirectCount > MAX_REDIRECTS) {
        console.error('리다이렉트 횟수 초과: 무한 루프 방지를 위해 리다이렉트를 중단합니다.');
        setRedirectBlocked(true);
        localStorage.removeItem('redirect_count'); // 카운터 초기화
        return;
      }
    } catch (e) {
      console.error("로컬 스토리지 접근 오류:", e);
    }
    
    // 리다이렉트가 차단되었으면 더 이상 진행하지 않음
    if (redirectBlocked) {
      setLoading(false);
      return;
    }
    
    // 인증되지 않은 사용자는 인증 페이지로 리다이렉트 (중복 리다이렉트 방지)
    if (!isAuthenticated && !redirectAttempted) {
      console.log(`미인증 사용자: 인증 페이지(${storeId})로 리다이렉트`);
      setRedirectAttempted(true);
      router.replace(`/auth/${storeId}`);
      return;
    }
    
    // 이미 인증되었으면 상품 목록 로드 진행
    if (isAuthenticated) {
      // 인증 성공 시 리다이렉트 카운터 초기화
      try {
        localStorage.setItem('redirect_count', '0');
      } catch (e) {
        console.error("로컬 스토리지 접근 오류:", e);
      }
      
      // 인증 후 저장된 상점 ID가 없거나 현재 상점 ID와 다른 경우 확인
      if (savedStoreId && savedStoreId !== storeId) {
        console.log(`다른 상점에 인증됨: 현재=${storeId}, 저장됨=${savedStoreId}`);
        // 여기서는 그냥 경고만 표시하고 진행합니다 (필요시 추가 인증 요구 가능)
      }
      
      // 상품 목록 로드
      const fetchProducts = async () => {
        if (!isMounted) return;
        
        try {
          const data = await getProductsByStore(storeId);
          if (isMounted) {
            setProducts(data);
            setLoading(false);
          }
        } catch (error) {
          if (isMounted) {
            toast({
              title: "오류 발생",
              description: "상품 목록을 불러오는 중 오류가 발생했습니다.",
              variant: "destructive",
            });
            setLoading(false);
          }
        }
      };

      fetchProducts();
    }
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, router, storeId, savedStoreId, toast, redirectAttempted, redirectBlocked]);

  const openDeleteDialog = (productId: string) => {
    setProductToDelete(productId);
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    try {
      const result = await deleteProduct(productToDelete, storeId);

      if (result.success) {
        setProducts(products.filter((product) => product.id !== productToDelete));
        toast({
          title: "상품 삭제 완료",
          description: "상품이 성공적으로 삭제되었습니다.",
        });
      } else {
        toast({
          title: "상품 삭제 실패",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "상품 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      closeDeleteDialog();
    }
  };

  // 리다이렉트가 차단된 경우 안내 메시지 표시
  if (redirectBlocked) {
    return (
      <MobileLayout title="오류 발생" storeId={storeId}>
        <div className="flex flex-col items-center justify-center h-[70vh] p-4">
          <div className="text-center space-y-4 max-w-md">
            <h2 className="text-lg font-semibold">리다이렉트 오류</h2>
            <p>무한 리다이렉트가 감지되어 중단되었습니다.</p>
            <p className="text-sm text-muted-foreground">인증 상태가 올바르게 처리되지 않았습니다. 다음 조치를 취해보세요:</p>
            <ul className="text-sm text-left list-disc pl-5 space-y-1">
              <li>브라우저 캐시 및 쿠키를 지우고 다시 시도</li>
              <li>다시 로그인</li>
              <li>페이지 새로고침</li>
            </ul>
            <Button 
              className="mt-4" 
              onClick={() => {
                localStorage.removeItem('redirect_count');
                setRedirectBlocked(false);
                router.replace(`/shop/${storeId}`);
              }}
            >
              고객 페이지로 이동
            </Button>
          </div>
        </div>
      </MobileLayout>
    );
  }

  // 인증 상태 확인
  if (!isAuthenticated) {
    return (
      <MobileLayout title="인증 필요" storeId={storeId}>
        <div className="flex flex-col items-center justify-center h-[70vh] p-4">
          <p className="mb-4 text-center">관리자 권한이 필요합니다.</p>
          <Button 
            onClick={() => {
              // 리다이렉트 카운터 초기화 (무한 루프 방지)
              try {
                localStorage.setItem('redirect_count', '0');
              } catch (e) {
                console.error("로컬 스토리지 접근 오류:", e);
              }
              setRedirectAttempted(true);
              router.push(`/auth/${storeId}`);
            }}
          >
            인증 페이지로 이동
          </Button>
        </div>
      </MobileLayout>
    );
  }

  if (loading) {
    return (
      <MobileLayout title="상품 관리" storeId={storeId}>
        <div className="flex items-center justify-center h-[70vh]">
          <p>로딩 중...</p>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="상품 관리" storeId={storeId}>
      <div className="p-4">
        <div className="flex justify-between mb-4">
          <p className="text-sm text-muted-foreground">상점 ID: {storeId}</p>
          <Button asChild size="sm">
            <Link href={`/admin/${storeId}/add`}>
              <PlusIcon className="mr-2 h-4 w-4" />
              상품 추가
            </Link>
          </Button>
        </div>

        <div className="space-y-4">
          {products.length === 0 ? (
            <div className="text-center py-8 border rounded-lg">등록된 상품이 없습니다.</div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="border rounded-lg overflow-hidden bg-white">
                <div className="flex items-center p-3">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover rounded-md"
                    />
                  </div>

                  <div className="flex-1 min-w-0 ml-3">
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-sm font-semibold">{formatPrice(product.price)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-8 w-8"
                    >
                      <Link href={`/admin/${storeId}/edit/${product.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => openDeleteDialog(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상품 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 상품을 정말로 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileLayout>
  );
} 