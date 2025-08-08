import { NextRequest, NextResponse } from 'next/server';
import { Uploader } from '@irys/upload';
import { Ethereum } from '@irys/upload-ethereum';

// Optimized save-chat API using Irys mutable references
// This reduces blockchain transactions and improves performance

export async function POST(request: NextRequest) {
  try {
    const { chatId, title, messages, userAddress } = await request.json();

    // Validate required fields
    if (!chatId || !title || !messages || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, title, messages, userAddress' },
        { status: 400 }
      );
    }

    // Initialize Irys uploader
    const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Server wallet not configured' },
        { status: 500 }
      );
    }

    const irysUploader = await Uploader(Ethereum).withWallet(privateKey);
    console.log('🔑 Irys uploader initialized with wallet:', irysUploader.address);

    // Check if this chat already exists by searching for existing transactions
    console.log('🔍 Checking for existing chat:', chatId);
    const existingChatQuery = `
      query getExistingChat {
        transactions(
          tags: [
            {
              name: "App-Name"
              values: ["ChatAppChats"]
            },
            {
              name: "Chat-ID"
              values: ["${chatId}"]
            },
            {
              name: "User-Address"
              values: ["${userAddress}"]
            }
          ]
          owners: ["${irysUploader.address}"]
          order: DESC
          first: 1
        ) {
          edges {
            node {
              id
              tags {
                name
                value
              }
            }
          }
        }
      }
    `;

    const existingResponse = await fetch('https://uploader.irys.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: existingChatQuery
      })
    });

    const existingResult = await existingResponse.json();
    const existingTransactions = existingResult.data?.transactions?.edges || [];
    
    let isUpdate = false;
    let rootTxId = null;
    
    if (existingTransactions.length > 0) {
      isUpdate = true;
      const latestTx = existingTransactions[0].node;
      
      // Check if this transaction has a Root-TX tag (meaning it's already an update)
      const rootTxTag = latestTx.tags.find((tag: any) => tag.name === 'Root-TX');
      if (rootTxTag) {
        // This is an update, use the existing root
        rootTxId = rootTxTag.value;
      } else {
        // This is the first update, the current transaction becomes the root
        rootTxId = latestTx.id;
      }
      
      console.log('📝 Updating existing chat. Root TX:', rootTxId);
    } else {
      console.log('🆕 Creating new chat');
    }

    // Prepare chat data
    const chatData = {
      chatId,
      title,
      messages,
      userAddress,
      createdAt: isUpdate ? undefined : new Date().toISOString(), // Only set on creation
      updatedAt: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(chatData).forEach(key => {
      if (chatData[key as keyof typeof chatData] === undefined) {
        delete chatData[key as keyof typeof chatData];
      }
    });

    // Prepare tags
    const baseTags = [
      { name: "App-Name", value: "ChatAppChats" },
      { name: "Type", value: "chat-session" },
      { name: "User-Address", value: userAddress },
      { name: "Chat-ID", value: chatId },
      { name: "Chat-Title", value: title },
      { name: "Message-Count", value: messages.length.toString() },
      { name: "Updated-At", value: chatData.updatedAt },
      { name: "Optimization", value: "mutable-reference" }
    ];

    // Add Root-TX tag for updates
    if (isUpdate && rootTxId) {
      baseTags.push({ name: "Root-TX", value: rootTxId });
    } else if (!isUpdate) {
      // Add creation timestamp only for new chats
      baseTags.push({ name: "Created-At", value: chatData.createdAt! });
    }

    // Upload to Irys
    console.log(`⬆️ ${isUpdate ? 'Updating' : 'Creating'} chat on Irys...`);
    const receipt = await irysUploader.upload(JSON.stringify(chatData, null, 2), { tags: baseTags });
    
    console.log('✅ Chat saved successfully!');
    console.log('🆔 Transaction ID:', receipt.id);
    
    // Determine the mutable URL
    const mutableTxId = rootTxId || receipt.id; // Use root for updates, current for new chats
    const mutableUrl = `https://gateway.irys.xyz/mutable/${mutableTxId}`;
    
    console.log('🔗 Mutable URL:', mutableUrl);
    
    // Return response with optimization info
    return NextResponse.json({
      success: true,
      transactionId: receipt.id,
      mutableUrl,
      rootTxId: mutableTxId,
      isUpdate,
      optimization: {
        type: 'mutable-reference',
        description: isUpdate 
          ? 'Chat updated using mutable reference - single URL for all versions'
          : 'New chat created with mutable reference support',
        benefits: [
          'Reduced blockchain transactions',
          'Consistent URL for all versions',
          'Faster loading through single endpoint',
          'Simplified version management'
        ]
      },
      metadata: {
        chatId,
        title,
        messageCount: messages.length,
        userAddress,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error saving chat:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}