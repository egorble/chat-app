"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUploadZone } from "@/components/ui/file-upload-zone"
import { FileList } from "@/components/ui/file-list"
import { Bot, Files, Upload, Settings } from "lucide-react"
import type { UploadedFile } from "../types/file"
import { FileAttachment } from "@/types/file-types"

interface CreateAgentDialogProps {
  onCreateAgent: (agent: { name: string; description: string; systemPrompt: string; files?: FileAttachment[] }) => Promise<void>
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function CreateAgentDialog({ onCreateAgent, open: externalOpen, onOpenChange }: CreateAgentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([])

  const handleFileUpload = (files: UploadedFile[]) => {
    const fileAttachments: FileAttachment[] = files.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: file.uploadedAt,
      irysId: file.irysId
    }))
    setAttachedFiles(prev => [...prev, ...fileAttachments])
  }

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && systemPrompt.trim()) {
      try {
        await onCreateAgent({
          name: name.trim(),
          description: description.trim(),
          systemPrompt: systemPrompt.trim(),
          files: attachedFiles.length > 0 ? attachedFiles : undefined
        })
        setName("")
        setDescription("")
        setSystemPrompt("")
        setAttachedFiles([])
        setOpen(false)
      } catch (error) {
        console.error('Failed to create agent:', error)
        alert('Failed to create agent. Please make sure your wallet is connected and try again.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2">
            Create an Agent
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Create New Agent
          </DialogTitle>
          <DialogDescription>
            Create a custom AI agent with a specific system prompt and optional file context.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <Files className="h-4 w-4" />
                Files ({attachedFiles.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Agent Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Code Helper, Writing Assistant"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of what this agent does"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="You are a helpful assistant that..."
                    className="min-h-[120px]"
                    required
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="files" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label>Upload Files (optional)</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload files to provide additional context for your agent
                  </p>
                  <FileUploadZone
                    onFilesUploaded={handleFileUpload}
                    maxFiles={10}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6"
                  />
                </div>
                
                {attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Attached Files</Label>
                    <FileList
                      files={attachedFiles}
                      onDelete={removeFile}
                      onDownload={(file) => {
                        // Create download link for the file
                        const url = URL.createObjectURL(new Blob([file.content || ''], { type: file.type }))
                        const a = document.createElement('a')
                        a.href = url
                        a.download = file.name
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        URL.revokeObjectURL(url)
                      }}
                      showActions={true}
                      showDownload={false}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || !systemPrompt.trim()}>
              Create Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}