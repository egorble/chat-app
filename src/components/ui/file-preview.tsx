"use client"

import React, { useState, useEffect } from 'react'
import { X, Download, Eye, FileText, Image as ImageIcon, Code, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FileAttachment } from '@/types/file-types'
import { cn } from '@/lib/utils'

interface FilePreviewProps {
  file: FileAttachment | null
  isOpen: boolean
  onClose: () => void
  onDownload: (file: FileAttachment) => void
}

export function FilePreview({ file, isOpen, onClose, onDownload }: FilePreviewProps) {
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!file || !isOpen) {
      setPreviewContent(null)
      setError(null)
      return
    }

    // If file has content already (text files), use it
    if (file.content) {
      setPreviewContent(file.content)
      return
    }

    // For other files, try to fetch preview if possible
    if (file.type.startsWith('text/') || file.type === 'application/json') {
      fetchFileContent()
    }
  }, [file, isOpen])

  const fetchFileContent = async () => {
    if (!file?.irysId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/upload-file-context?irysId=${file.irysId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch file content')
      }

      const text = await response.text()
      setPreviewContent(text)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file content')
    } finally {
      setIsLoading(false)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5" />
    }
    if (type.includes('pdf') || type.includes('document')) {
      return <FileText className="h-5 w-5" />
    }
    if (type.includes('zip') || type.includes('archive')) {
      return <Archive className="h-5 w-5" />
    }
    if (type.includes('json') || type.includes('javascript') || type.includes('typescript')) {
      return <Code className="h-5 w-5" />
    }
    return <FileText className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const canPreview = (type: string) => {
    return type.startsWith('text/') || 
           type === 'application/json' || 
           type.startsWith('image/')
  }

  const renderPreview = () => {
    if (!file) return null

    if (isLoading) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">{error}</p>
        </div>
      )
    }

    // Image preview
    if (file.type.startsWith('image/') && file.irysId) {
      return (
        <div className="flex justify-center">
          <img
            src={`https://gateway.irys.xyz/${file.irysId}`}
            alt={file.name}
            className="max-w-full max-h-96 object-contain rounded-lg"
            onError={() => setError('Failed to load image')}
          />
        </div>
      )
    }

    // Text content preview
    if (previewContent) {
      return (
        <ScrollArea className="h-96">
          <pre className={cn(
            'text-sm whitespace-pre-wrap break-words p-4 rounded-lg',
            'bg-muted/50 border'
          )}>
            {previewContent}
          </pre>
        </ScrollArea>
      )
    }

    // No preview available
    if (!canPreview(file.type)) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Preview not available for this file type</p>
          <p className="text-xs mt-2">Click download to view the file</p>
        </div>
      )
    }

    return null
  }

  if (!file) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getFileIcon(file.type)}
              <div>
                <DialogTitle className="text-left">{file.name}</DialogTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="secondary">
                    {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(file.uploadedAt)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(file)}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {file.description && (
            <p className="text-sm text-muted-foreground text-left mt-2">
              {file.description}
            </p>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  )
}