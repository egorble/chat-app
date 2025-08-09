import { NextRequest, NextResponse } from 'next/server'
import { Uploader } from '@irys/upload'
import { Ethereum } from '@irys/upload-ethereum'
import { FileAttachment } from '@/types/file-types'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const agentId = formData.get('agentId') as string
    const description = formData.get('description') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!agentId) {
      return NextResponse.json(
        { success: false, error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Check file type
    const allowedTypes = [
      'text/plain', 'text/markdown', 'text/csv',
      'application/pdf', 'application/json',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File type not supported' },
        { status: 400 }
      )
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    let content: string | undefined
    
    // Extract text content for supported text files
    if (file.type.startsWith('text/') || file.type === 'application/json') {
      content = buffer.toString('utf-8')
    }

    try {
      // Initialize Irys uploader with server wallet
      const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
      if (!privateKey) {
        return NextResponse.json(
          { success: false, error: 'Server wallet not configured' },
          { status: 500 }
        );
      }

      const irysUploader = await Uploader(Ethereum).withWallet(privateKey);
      console.log('🔑 Irys uploader initialized for file context upload');

      // Prepare tags for file
      const tags = [
        { name: 'App-Name', value: 'ChatAppAgents' },
        { name: 'Type', value: 'file-context' },
        { name: 'Content-Type', value: file.type },
        { name: 'File-Name', value: file.name },
        { name: 'File-Size', value: file.size.toString() },
        { name: 'Agent-Id', value: agentId },
        { name: 'Upload-Type', value: 'file-context' },
        { name: 'Uploaded-At', value: new Date().toISOString() }
      ];
      
      if (description) {
        tags.push({ name: 'Description', value: description });
      }
      
      // Upload to Irys
      const receipt = await irysUploader.upload(buffer, { tags });
      console.log('🎉 File context upload successful! Irys ID:', receipt.id);
      
      const irysResult = { id: receipt.id };

      // Create file attachment object
      const fileAttachment: FileAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        content,
        irysId: irysResult.id,
        uploadedAt: new Date(),
        lastModified: new Date(file.lastModified),
        description
      }

      return NextResponse.json({
        success: true,
        file: fileAttachment,
        irysId: irysResult.id
      })

    } catch (irysError) {
      console.error('Failed to upload to Irys:', irysError)
      return NextResponse.json(
        { success: false, error: 'Failed to upload file to decentralized storage' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get file content from Irys
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const irysId = searchParams.get('irysId')

    if (!irysId) {
      return NextResponse.json(
        { success: false, error: 'Irys ID is required' },
        { status: 400 }
      )
    }

    try {
      // Fetch data directly from Irys gateway
      const response = await fetch(`https://gateway.irys.xyz/${irysId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`)
      }
      
      const data = await response.arrayBuffer()
      
      return new NextResponse(data, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment'
        }
      })

    } catch (irysError) {
      console.error('Failed to fetch from Irys:', irysError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch file from decentralized storage' },
        { status: 404 }
      )
    }

  } catch (error) {
    console.error('File fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}