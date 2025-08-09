"use client"

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { UploadedFile, FileUploadProgress } from '@/types/file'

// File type constants
const SUPPORTED_FILE_TYPES = {
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp']
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface FileUploadZoneProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  maxFiles?: number
  disabled?: boolean
  agentId?: string
  className?: string
}

export function FileUploadZone({
  onFilesUploaded,
  maxFiles = 20,
  disabled = false,
  agentId,
  className
}: FileUploadZoneProps) {
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const uploadFile = async (file: File): Promise<UploadedFile> => {
    // Generate safe UUID for SSR compatibility
    const generateId = () => {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID()
      }
      return 'file_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now()
    }
    
    const fileId = generateId()
    
    // Add to upload progress
    setUploadProgress(prev => [...prev, {
      fileId,
      fileName: file.name,
      progress: 0,
      status: 'uploading'
    }])

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Use different endpoint based on whether agentId is provided
      const endpoint = agentId ? '/api/upload-file-context' : '/api/upload-file-temp'
      
      if (agentId) {
        formData.append('agentId', agentId)
      }

      // Update progress
      setUploadProgress(prev => prev.map(p => 
        p.fileId === fileId ? { ...p, progress: 50, status: 'uploading' } : p
      ))

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      // Update progress to completed
      setUploadProgress(prev => prev.map(p => 
        p.fileId === fileId ? { ...p, progress: 100, status: 'completed' } : p
      ))

      const uploadedFile: UploadedFile = {
        id: result.file?.id || result.data?.id || generateId(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date(),
        irysId: result.file?.irysId || result.data?.irysId
      }
      
      // Remove from progress after delay
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.fileId !== fileId))
      }, 2000)
      
      return uploadedFile

    } catch (error) {
      console.error('Upload error:', error)
      
      // Update progress to error
      setUploadProgress(prev => prev.map(p => 
        p.fileId === fileId ? { 
          ...p, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed'
        } : p
      ))

      // Remove from progress after delay
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.fileId !== fileId))
      }, 5000)
      
      // Re-throw error to be handled by caller
      throw error
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (disabled || isUploading) return

    setIsUploading(true)
    const uploadedFiles: UploadedFile[] = []

    for (const file of acceptedFiles) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        console.error(`File "${file.name}" exceeds the 10MB size limit`)
        continue
      }

      // Validate file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const allSupportedTypes = Object.values(SUPPORTED_FILE_TYPES).flat()
      
      if (!fileExtension || !allSupportedTypes.includes(`.${fileExtension}`)) {
        console.error(`File type "${fileExtension}" is not supported`)
        continue
      }

      try {
        const uploadedFile = await uploadFile(file)
        uploadedFiles.push(uploadedFile)
      } catch (error) {
        console.error(`Failed to upload file "${file.name}":`, error)
      }
    }

    // Call callback with all uploaded files
    if (uploadedFiles.length > 0) {
      onFilesUploaded(uploadedFiles)
    }

    setIsUploading(false)
  }, [disabled, isUploading, onFilesUploaded])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: disabled || isUploading,
    maxFiles,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'application/json': ['.json'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/svg+xml': ['.svg'],
      'image/webp': ['.webp']
    }
  })

  const removeUploadProgress = (fileId: string) => {
    setUploadProgress(prev => prev.filter(p => p.fileId !== fileId))
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          'hover:border-primary/50 hover:bg-accent/50',
          isDragActive && 'border-primary bg-accent',
          (disabled || isUploading) && 'opacity-50 cursor-not-allowed',
          'border-border'
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <Upload className={cn(
            'h-12 w-12 text-muted-foreground',
            isDragActive && 'text-primary'
          )} />
          
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to select files
            </p>
            <p className="text-xs text-muted-foreground">
              Supports: PDF, DOCX, TXT, MD, CSV, JSON, Images (max 10MB each)
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress.length > 0 && (
        <div className="space-y-2">
          {uploadProgress.map((progress) => (
            <div key={progress.fileId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  <span>Uploading file...</span>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadProgress(progress.fileId)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <Progress 
                value={progress.progress} 
                className={cn(
                  'h-2',
                  progress.status === 'error' && 'bg-destructive/20'
                )}
              />
              
              {progress.status === 'error' && progress.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{progress.error}</AlertDescription>
                </Alert>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}