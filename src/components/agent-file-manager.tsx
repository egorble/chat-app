"use client"

import React, { useState } from 'react'
import { toast } from 'sonner'
import { FileAttachment } from '@/types/file-types'
import { useAgents } from '@/contexts/agents-context'
import { FileUploadZone } from '@/components/ui/file-upload-zone'
import { FileList } from '@/components/ui/file-list'
import { FilePreview } from '@/components/ui/file-preview'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Files, Upload, Eye } from 'lucide-react'

interface AgentFileManagerProps {
  agentId: string
  className?: string
}

export function AgentFileManager({ agentId, className }: AgentFileManagerProps) {
  const { getAgentFiles, addFileToAgent, removeFileFromAgent, getAgent } = useAgents()
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  
  const agent = getAgent(agentId)
  const files = getAgentFiles(agentId)
  
  const handleFileUpload = async (file: FileAttachment) => {
    try {
      await addFileToAgent(agentId, file)
      toast.success(`File "${file.name}" uploaded successfully`)
    } catch (error) {
      console.error('Failed to add file to agent:', error)
      toast.error('Failed to add file to agent')
    }
  }
  
  const handleFileDelete = async (fileId: string) => {
    try {
      const fileToDelete = files.find(f => f.id === fileId)
      await removeFileFromAgent(agentId, fileId)
      toast.success(`File "${fileToDelete?.name}" removed successfully`)
    } catch (error) {
      console.error('Failed to remove file from agent:', error)
      toast.error('Failed to remove file')
    }
  }
  
  const handleFileDownload = async (file: FileAttachment) => {
    try {
      if (!file.irysId) {
        toast.error('File not available for download')
        return
      }
      
      const response = await fetch(`/api/upload-file-context?irysId=${file.irysId}`)
      
      if (!response.ok) {
        throw new Error('Failed to download file')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success(`File "${file.name}" downloaded successfully`)
    } catch (error) {
      console.error('Failed to download file:', error)
      toast.error('Failed to download file')
    }
  }
  
  const handleFilePreview = (file: FileAttachment) => {
    setPreviewFile(file)
    setIsPreviewOpen(true)
  }
  
  const handleUploadError = (error: string) => {
    toast.error(error)
  }
  
  const getTotalSize = () => {
    return files.reduce((total, file) => total + file.size, 0)
  }
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  if (!agent) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Agent not found</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center space-x-2">
                <Files className="h-5 w-5" />
                <span>File Context for {agent.name}</span>
              </CardTitle>
              <CardDescription>
                Upload files to provide additional context for your agent
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {files.length} files
              </Badge>
              <Badge variant="outline">
                {formatFileSize(getTotalSize())}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="upload" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upload" className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Upload Files</span>
              </TabsTrigger>
              <TabsTrigger value="manage" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Manage Files ({files.length})</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="space-y-4">
              <FileUploadZone
                agentId={agentId}
                onFilesUploaded={(uploadedFiles) => {
                  uploadedFiles.forEach(file => {
                    const fileAttachment: FileAttachment = {
                      id: file.id,
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      uploadedAt: file.uploadedAt,
                      irysId: file.irysId
                    }
                    handleFileUpload(fileAttachment)
                  })
                }}
                maxFiles={20}
              />
              
              {files.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recently uploaded files:</h4>
                  <FileList
                    files={files.slice(-3)} // Show last 3 files
                    onDownload={handleFileDownload}
                    onDelete={handleFileDelete}
                    showActions={false}
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="manage" className="space-y-4">
              <FileList
                files={files}
                onDownload={handleFileDownload}
                onDelete={handleFileDelete}
                showActions={true}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <FilePreview
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false)
          setPreviewFile(null)
        }}
        onDownload={handleFileDownload}
      />
    </div>
  )
}