"use client"

import React from 'react'
import { FileText, Image as ImageIcon, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { UploadedFile } from '@/types/file'

interface FileDisplayProps {
  file: UploadedFile
  className?: string
}

export function FileDisplay({ file, className }: FileDisplayProps) {
  const getFileIcon = () => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />
    }
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDownload = async () => {
    if (file.irysId) {
      try {
        const response = await fetch(`/api/upload-file-context?irysId=${file.irysId}`)
        if (response.ok) {
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = file.name
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
        }
      } catch (error) {
        console.error('Download failed:', error)
      }
    }
  }

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 bg-muted/50 rounded-lg border',
      className
    )}>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {getFileIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">
              {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>
      </div>
      
      {file.irysId && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          className="shrink-0"
        >
          <Download className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}