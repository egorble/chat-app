import { NextRequest, NextResponse } from 'next/server'
import { Uploader } from '@irys/upload'
import { Ethereum } from '@irys/upload-ethereum'
import { FileAttachment } from '@/types/file-types'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
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

    // Initialize Irys uploader with server wallet
    const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { success: false, error: 'Server wallet not configured' },
        { status: 500 }
      );
    }

    const irysUploader = await Uploader(Ethereum).withWallet(privateKey);
    console.log('🔑 Irys uploader initialized for file upload');

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Prepare tags for file
    const tags = [
      { name: 'App-Name', value: 'ChatAppAgents' },
      { name: 'Type', value: 'file-attachment' },
      { name: 'File-Name', value: file.name },
      { name: 'File-Type', value: file.type },
      { name: 'File-Size', value: file.size.toString() },
      { name: 'Uploaded-At', value: new Date().toISOString() },
      { name: 'Temporary', value: 'true' }
    ];
    
    if (description) {
      tags.push({ name: 'Description', value: description });
    }
    
    // Upload to Irys
    const receipt = await irysUploader.upload(buffer, { tags });
    console.log('🎉 File upload successful! Irys ID:', receipt.id);
    
    const irysId = receipt.id;

    const fileAttachment: FileAttachment = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      irysId: irysId,
      description: description
    }

    return NextResponse.json({
      success: true,
      file: fileAttachment
    })

  } catch (error: any) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}

// GET endpoint for downloading files
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const irysId = searchParams.get('irysId')

    if (!irysId) {
      return NextResponse.json(
        { error: 'Missing irysId parameter' },
        { status: 400 }
      )
    }

    // Initialize Irys uploader with server wallet
    const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Server wallet not configured' },
        { status: 500 }
      );
    }

    const irysUploader = await Uploader(Ethereum).withWallet(privateKey);
    
    // Download file from Irys
    const response = await fetch(`https://gateway.irys.xyz/${irysId}`);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const fileData = {
      buffer: Buffer.from(buffer),
      contentType,
      filename: `file_${irysId}`
    };
    
    if (!fileData) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Return file data
    return new NextResponse(fileData.buffer, {
      headers: {
        'Content-Type': fileData.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileData.filename || 'download'}"`
      }
    })

  } catch (error: any) {
    console.error('File download error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to download file' },
      { status: 500 }
    )
  }
}