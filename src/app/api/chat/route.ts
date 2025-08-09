import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Le Chat - AI Assistant',
  },
});

export async function POST(request: NextRequest) {
  try {
    const { message, systemPrompt, conversationHistory, files } = await request.json();

    if (!message && (!files || files.length === 0)) {
      return NextResponse.json(
        { error: 'Message or files are required' },
        { status: 400 }
      );
    }

    // Build messages array with optional system prompt and conversation history
    const messages: any[] = [];
    
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }
    
    // Add conversation history if provided (excluding the current message)
    if (conversationHistory && Array.isArray(conversationHistory)) {
      // Limit conversation history to last 20 messages to avoid token limits
      const recentHistory = conversationHistory.slice(-20);
      messages.push(...recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }
    
    // Prepare user message content
    let userContent = message || '';
    
    // Add file contents if files are provided
    if (files && files.length > 0) {
      const fileContents = [];
      
      for (const file of files) {
        try {
          // Fetch file content from our API
          const fileResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/upload-file-context?irysId=${file.irysId}`);
          if (fileResponse.ok) {
            const fileData = await fileResponse.text();
            fileContents.push(`\n\n--- File: ${file.name} (${file.type}) ---\n${fileData}\n--- End of ${file.name} ---`);
          } else {
            fileContents.push(`\n\n--- File: ${file.name} (${file.type}) ---\n[Error: Could not load file content]\n--- End of ${file.name} ---`);
          }
        } catch (error) {
          console.error(`Error loading file ${file.name}:`, error);
          fileContents.push(`\n\n--- File: ${file.name} (${file.type}) ---\n[Error: Could not load file content]\n--- End of ${file.name} ---`);
        }
      }
      
      if (fileContents.length > 0) {
        userContent += '\n\nAttached files:' + fileContents.join('');
      }
    }
    
    // Add the current user message
    messages.push({
      role: 'user',
      content: userContent,
    });

    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages,
      stream: true,
    });

    // Create a readable stream for streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let totalContent = ''
        let chunkCount = 0
        
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              totalContent += content
              chunkCount++
              const data = `data: ${JSON.stringify({ content })}\n\n`
              controller.enqueue(encoder.encode(data))
            }
          }
          
          // Log completion statistics
          console.log('🤖 OpenAI response completed:', {
            totalLength: totalContent.length,
            chunkCount,
            isEmpty: totalContent.trim() === '',
            preview: totalContent.substring(0, 100) + (totalContent.length > 100 ? '...' : '')
          })
          
          // Warn if response is empty
          if (totalContent.trim() === '') {
            console.warn('⚠️ OpenAI returned empty response!')
          }
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        } finally {
          controller.close()
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}