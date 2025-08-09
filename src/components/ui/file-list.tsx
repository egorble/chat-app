"use client"

import React from 'react'
import { File, Download, Trash2, FileText, Image, Archive, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FileAttachment } from '@/types/file-types'
import { cn } from '@/lib/utils'

interface FileListProps {
  files: FileAttachment[]
  onDownload: (file: FileAttachment) => void
  onDelete: (fileId: string) => void
  className?: string
  showActions?: boolean
  showDownload?: boolean
}

export function FileList({
  files,
  onDownload,
  onDelete,
  className,
  showActions = true,
  showDownload = true
}: FileListProps) {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-4 w-4" />
    }
    if (type.includes('pdf') || type.includes('document')) {
      return <FileText className="h-4 w-4" />
    }
    if (type.includes('zip') || type.includes('archive')) {
      return <Archive className="h-4 w-4" />
    }
    if (type.includes('json') || type.includes('javascript') || type.includes('typescript')) {
      return <Code className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  }

  const getFileTypeColor = (type: string) => {
    if (type.startsWith('image/')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    if (type.includes('pdf')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    if (type.includes('document')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    if (type.includes('json') || type.includes('javascript')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    if (type.includes('text')) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
  }

  if (files.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No files uploaded yet</p>
        <p className="text-sm">Upload files to provide context for your agent</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {files.map((file) => (
        <Card key={file.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm font-medium truncate cursor-help">
                            {file.name}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{file.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <Badge 
                      variant="secondary" 
                      className={cn('text-xs', getFileTypeColor(file.type))}
                    >
                      {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{formatDate(file.uploadedAt)}</span>
                    {file.irysId && (
                      <>
                        <span>•</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help text-green-600 dark:text-green-400">
                                Decentralized
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Stored on Irys Network</p>
                              <p className="text-xs opacity-75">ID: {file.irysId}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                  </div>
                  
                  {file.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {file.description}
                    </p>
                  )}
                </div>
              </div>
              
              {showActions && (
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {showDownload && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDownload(file)}
                            className="h-8 w-8 p-0"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download file</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(file.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Delete file</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}