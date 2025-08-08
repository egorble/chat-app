import { NextRequest, NextResponse } from 'next/server';
import { Uploader } from '@irys/upload';
import { Ethereum } from '@irys/upload-ethereum';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
}

interface ChatData {
  chatId: string;
  title: string;
  messages: Message[];
  userAddress: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { chatId, title, messages, userAddress, isDeleted, deletedAt } = await request.json();

    if (!chatId || !messages || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, messages, userAddress' },
        { status: 400 }
      );
    }

    // Initialize Irys with server wallet
    const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ SERVER_WALLET_PRIVATE_KEY not found in environment');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('🔧 Initializing Irys with server wallet...');
    const irysUploader = await Uploader(Ethereum).withWallet(privateKey);
    console.log('✅ Irys uploader initialized');

    // Prepare chat data
    const chatData: ChatData = {
      chatId,
      title,
      messages,
      userAddress,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: isDeleted || false,
      deletedAt: deletedAt || undefined
    };

    const chatDataJson = JSON.stringify(chatData, null, 2);
    const logMessage = isDeleted 
      ? `🗑️ Preparing deletion data for chat: ${chatId}`
      : `📝 Chat data prepared: ${chatId} (${messages.length} messages)`;
    console.log(logMessage, {
      chatId,
      title,
      userAddress,
      messageCount: messages.length,
      dataSize: chatDataJson.length,
      isDeleted: isDeleted || false
    });

    // Create tags for the chat
    const tags = [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'App-Name', value: 'ChatAppChats' },
      { name: 'Chat-ID', value: chatId },
      { name: 'User-Address', value: userAddress },
      { name: 'Chat-Title', value: title },
      { name: 'Message-Count', value: messages.length.toString() },
      { name: 'Type', value: 'chat-session' },
      { name: 'Created-At', value: chatData.createdAt },
      { name: 'Updated-At', value: chatData.updatedAt },
      { name: 'Is-Deleted', value: (isDeleted || false).toString() },
      { name: 'Deleted-At', value: deletedAt || '' }
    ];
    console.log('🏷️ Tags created:', tags);

    // Upload to Irys
    console.log('⬆️ Starting upload to Irys...');
    const receipt = await irysUploader.upload(chatDataJson, { tags });
    console.log('🎉 Upload successful! Irys ID:', receipt.id);
    console.log('📋 Full receipt:', receipt);

    return NextResponse.json({
      success: true,
      irysId: receipt.id,
      chatId,
      timestamp: receipt.timestamp
    });

  } catch (error) {
    console.error('❌ Error saving chat to Irys:', error);
    return NextResponse.json(
      { error: 'Failed to save chat to Irys', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}