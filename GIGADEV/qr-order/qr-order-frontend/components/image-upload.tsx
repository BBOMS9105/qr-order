"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { uploadImage } from "@/lib/actions"
import { useToast } from "@/components/ui/use-toast"
import { Camera, Upload, X } from "lucide-react"
import Image from "next/image"

interface ImageUploadProps {
  defaultImage?: string
  onImageChange: (imageUrl: string) => void
}

export default function ImageUpload({ defaultImage, onImageChange }: ImageUploadProps) {
  const [image, setImage] = useState<string>(defaultImage || "/placeholder.svg?height=300&width=300")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)

      // 파일 유효성 검사
      if (!file.type.startsWith("image/")) {
        toast({
          title: "이미지 파일만 업로드 가능합니다",
          variant: "destructive",
        })
        return
      }

      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "파일 크기는 5MB 이하여야 합니다",
          variant: "destructive",
        })
        return
      }

      // 이미지 미리보기 생성
      const reader = new FileReader()
      reader.onload = (event) => {
        const previewUrl = event.target?.result as string
        setImage(previewUrl)
      }
      reader.readAsDataURL(file)

      // 서버에 이미지 업로드
      const formData = new FormData()
      formData.append("file", file)
      const result = await uploadImage(formData)

      if (result.success) {
        onImageChange(result.imageUrl)
        toast({
          title: "이미지 업로드 성공",
          description: "이미지가 성공적으로 업로드되었습니다.",
        })
      } else {
        toast({
          title: "이미지 업로드 실패",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "이미지 업로드 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleRemoveImage = () => {
    setImage("/placeholder.svg?height=300&width=300")
    onImageChange("/placeholder.svg?height=300&width=300")
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
        <Image src={image || "/placeholder.svg"} alt="상품 이미지" fill className="object-cover" />

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">업로드 중...</div>
        )}

        {image !== "/placeholder.svg?height=300&width=300" && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex space-x-2">
        <Button type="button" variant="outline" className="flex-1" onClick={handleCameraClick}>
          <Camera className="mr-2 h-4 w-4" />
          사진 촬영
        </Button>

        <Button type="button" variant="outline" className="flex-1" onClick={handleCameraClick}>
          <Upload className="mr-2 h-4 w-4" />
          갤러리에서 선택
        </Button>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <input type="hidden" name="image" value={image} />
    </div>
  )
}
