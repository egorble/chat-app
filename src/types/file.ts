export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: Date
  irysId?: string
  url?: string
}

export interface FileUploadProgress {
  fileId: string
  progress: number
  status: 'uploading' | 'completed' | 'error'
  error?: string
}