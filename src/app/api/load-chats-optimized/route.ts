import { NextRequest, NextResponse } from 'next/server';
import { Uploader } from '@irys/upload';
import { Ethereum } from '@irys/upload-ethereum';

// Optimized load-chats API using Irys mutable references
// This provides faster loading and simplified version management

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // Initialize Irys for server wallet address
    const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: 'Server wallet not configured' },
        { status: 500 }
      );
    }

    const irysUploader = await Uploader(Ethereum).withWallet(privateKey);
    const serverWalletAddress = irysUploader.address;
    console.log('🔑 Server wallet address:', serverWalletAddress);

    // Step 1: Get all chat transactions for the user (optimized query)
    console.log('🔍 Loading chats for user:', userAddress);
    const chatsQuery = `
      query getUserChats {
        transactions(
          tags: [
            {
              name: "App-Name"
              values: ["ChatAppChats"]
            },
            {
              name: "Type"
              values: ["chat-session"]
            },
            {
              name: "User-Address"
              values: ["${userAddress}"]
            }
          ]
          owners: ["${serverWalletAddress}"]
          order: DESC
          first: 100
        ) {
          edges {
            node {
              id
              timestamp
              tags {
                name
                value
              }
            }
          }
        }
      }
    `;

    const response = await fetch('https://uploader.irys.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: chatsQuery
      })
    });

    const result = await response.json();
    const transactions = result.data?.transactions?.edges || [];
    console.log(`📊 Found ${transactions.length} total transactions`);

    if (transactions.length === 0) {
      return NextResponse.json({
        chats: [],
        optimization: {
          type: 'mutable-reference',
          description: 'No chats found for user',
          performance: {
            totalTransactions: 0,
            uniqueChats: 0,
            loadingMethod: 'optimized-graphql'
          }
        }
      });
    }

    // Step 2: Group transactions by chat and identify root transactions
    const chatGroups = new Map<string, {
      chatId: string;
      rootTxId: string;
      latestTxId: string;
      latestTimestamp: number;
      title: string;
      messageCount: number;
      isDeleted: boolean;
      transactions: any[];
    }>();

    for (const edge of transactions) {
      const { node } = edge;
      const tags = node.tags;
      
      // Extract metadata from tags
      const chatId = tags.find((tag: any) => tag.name === 'Chat-ID')?.value;
      const title = tags.find((tag: any) => tag.name === 'Chat-Title')?.value || 'Untitled Chat';
      const messageCount = parseInt(tags.find((tag: any) => tag.name === 'Message-Count')?.value || '0');
      const isDeleted = tags.find((tag: any) => tag.name === 'Is-Deleted')?.value === 'true';
      const rootTxTag = tags.find((tag: any) => tag.name === 'Root-TX')?.value;
      
      if (!chatId) continue;
      
      const timestamp = parseInt(node.timestamp);
      
      // Determine root transaction ID
      const rootTxId = rootTxTag || node.id; // If no Root-TX tag, this is the root
      
      if (!chatGroups.has(chatId)) {
        chatGroups.set(chatId, {
          chatId,
          rootTxId,
          latestTxId: node.id,
          latestTimestamp: timestamp,
          title,
          messageCount,
          isDeleted,
          transactions: [node]
        });
      } else {
        const existing = chatGroups.get(chatId)!;
        existing.transactions.push(node);
        
        // Update if this transaction is newer
        if (timestamp > existing.latestTimestamp) {
          existing.latestTxId = node.id;
          existing.latestTimestamp = timestamp;
          existing.title = title;
          existing.messageCount = messageCount;
          existing.isDeleted = isDeleted;
        }
      }
    }

    console.log(`📋 Grouped into ${chatGroups.size} unique chats`);

    // Step 3: Filter out deleted chats and prepare mutable URLs
    const activeChats = Array.from(chatGroups.values())
      .filter(chat => !chat.isDeleted)
      .sort((a, b) => b.latestTimestamp - a.latestTimestamp);

    console.log(`✅ Found ${activeChats.length} active chats`);

    // Step 4: Load chat data using mutable URLs (optimized approach)
    const chatsWithData = await Promise.all(
      activeChats.map(async (chat) => {
        try {
          // Use mutable URL for consistent access to latest version
          const mutableUrl = `https://gateway.irys.xyz/mutable/${chat.rootTxId}`;
          
          console.log(`📥 Loading chat ${chat.chatId} via mutable URL`);
          const chatResponse = await fetch(mutableUrl);
          
          if (!chatResponse.ok) {
            console.warn(`⚠️ Failed to load chat ${chat.chatId} via mutable URL, falling back to direct access`);
            // Fallback to direct access of latest transaction
            const fallbackResponse = await fetch(`https://gateway.irys.xyz/${chat.latestTxId}`);
            if (!fallbackResponse.ok) {
              throw new Error(`Failed to load chat data: ${fallbackResponse.statusText}`);
            }
            const fallbackData = await fallbackResponse.json();
            return {
              ...fallbackData,
              transactionId: chat.latestTxId,
              mutableUrl,
              rootTxId: chat.rootTxId,
              loadingMethod: 'fallback-direct',
              versionCount: chat.transactions.length
            };
          }
          
          const chatData = await chatResponse.json();
          return {
            ...chatData,
            transactionId: chat.latestTxId,
            mutableUrl,
            rootTxId: chat.rootTxId,
            loadingMethod: 'mutable-reference',
            versionCount: chat.transactions.length
          };
          
        } catch (error) {
          console.error(`❌ Error loading chat ${chat.chatId}:`, error);
          return null;
        }
      })
    );

    // Filter out failed loads
    const successfulChats = chatsWithData.filter(chat => chat !== null);
    
    console.log(`🎉 Successfully loaded ${successfulChats.length} chats`);

    // Step 5: Calculate optimization metrics
    const optimizationMetrics = {
      totalTransactions: transactions.length,
      uniqueChats: chatGroups.size,
      activeChats: activeChats.length,
      successfulLoads: successfulChats.length,
      mutableUrlUsage: successfulChats.filter(chat => chat.loadingMethod === 'mutable-reference').length,
      fallbackUsage: successfulChats.filter(chat => chat.loadingMethod === 'fallback-direct').length,
      averageVersionsPerChat: activeChats.length > 0 
        ? (activeChats.reduce((sum, chat) => sum + chat.transactions.length, 0) / activeChats.length).toFixed(2)
        : 0
    };

    return NextResponse.json({
      chats: successfulChats,
      optimization: {
        type: 'mutable-reference',
        description: 'Chats loaded using optimized mutable references',
        benefits: [
          'Single URL per chat (regardless of updates)',
          'Automatic latest version access',
          'Reduced GraphQL complexity',
          'Faster loading through direct mutable endpoints'
        ],
        performance: optimizationMetrics,
        loadingStrategy: {
          primary: 'mutable-reference',
          fallback: 'direct-transaction-access',
          explanation: 'Uses mutable URLs for consistent access, falls back to direct access if needed'
        }
      },
      metadata: {
        userAddress,
        serverWallet: serverWalletAddress,
        timestamp: new Date().toISOString(),
        queryTime: Date.now()
      }
    });

  } catch (error) {
    console.error('❌ Error loading chats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load chats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}