// Types for file upload and context functionality

export interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  content?: string // For text files
  irysId?: string
  uploadedAt: Date
  lastModified?: Date
  description?: string
}

export interface FileContext {
  files: FileAttachment[]
  totalSize: number
  maxFiles: number
  allowedTypes: string[]
}

export interface FileUploadResponse {
  success: boolean
  file?: FileAttachment
  error?: string
  irysId?: string
}

export interface FileUploadProgress {
  fileId: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

// Supported file types
export const SUPPORTED_FILE_TYPES = {
  documents: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'],
  spreadsheets: ['csv', 'xls', 'xlsx'],
  images: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'],
  code: ['js', 'ts', 'py', 'json', 'xml', 'html', 'css', 'yaml', 'yml'],
  archives: ['zip', 'rar', '7z']
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILES_PER_AGENT = 20

// File processing status
export type FileProcessingStatus = 'pending' | 'processing' | 'completed' | 'error'

export interface ProcessedFileContent {
  fileId: string
  extractedText?: string
  metadata?: Record<string, any>
  processingStatus: FileProcessingStatus
  processingError?: string
}