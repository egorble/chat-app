import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 });
    }

    console.log('🔍 Loading chats for user:', userAddress);

    // Get server wallet address from environment
    const serverWalletKey = process.env.SERVER_WALLET_PRIVATE_KEY;
    if (!serverWalletKey) {
      return NextResponse.json({ error: 'Server wallet not configured' }, { status: 500 });
    }

    // Import Irys to get server wallet address
    const { Uploader } = await import('@irys/upload');
    const { Ethereum } = await import('@irys/upload-ethereum');
    const irysUploader = await Uploader(Ethereum).withWallet(serverWalletKey);
    const serverWalletAddress = irysUploader.address;

    console.log('🔑 Server wallet address:', serverWalletAddress);
    console.log('👤 Searching for user:', userAddress);

    // GraphQL query to find ALL chat transactions for the user
    const query = `
      query getUserChats($owner: String!) {
        transactions(
          owners: [$owner]
          tags: [
            { name: "App-Name", values: ["ChatAppChats"] }
            { name: "Type", values: ["chat-session"] }
            { name: "User-Address", values: ["${userAddress}"] }
          ]
          first: 200
          order: DESC
        ) {
          edges {
            node {
              id
              tags {
                name
                value
              }
              timestamp
            }
          }
        }
      }
    `;

    const variables = {
      owner: serverWalletAddress
    };

    console.log('📡 Executing GraphQL query for user chats...');

    // Execute GraphQL query
    const response = await fetch('https://uploader.irys.xyz/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`GraphQL query failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📊 GraphQL response received with', result.data?.transactions?.edges?.length || 0, 'transactions');

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const transactions = result.data?.transactions?.edges || [];
    console.log(`📦 Processing ${transactions.length} transactions...`);

    // Group transactions by Chat-ID to find the latest version of each chat
    const chatTransactions = new Map<string, any>();
    const deletedChats = new Set<string>();
    
    // First pass: identify all deleted chats
    for (const edge of transactions) {
      const chatIdTag = edge.node.tags.find((tag: any) => tag.name === 'Chat-ID');
      const isDeletedTag = edge.node.tags.find((tag: any) => tag.name === 'Is-Deleted');
      
      if (chatIdTag && isDeletedTag?.value === 'true') {
        deletedChats.add(chatIdTag.value);
        console.log('🗑️ Marking chat as deleted:', chatIdTag.value);
      }
    }
    
    // Second pass: collect latest versions of non-deleted chats
    for (const edge of transactions) {
      const chatIdTag = edge.node.tags.find((tag: any) => tag.name === 'Chat-ID');
      
      if (!chatIdTag) {
        console.log('⚠️ Skipping transaction without Chat-ID:', edge.node.id);
        continue;
      }
      
      const chatId = chatIdTag.value;
      
      // Skip if this chat is marked as deleted
      if (deletedChats.has(chatId)) {
        console.log('🚫 Skipping deleted chat:', chatId);
        continue;
      }
      
      const timestamp = parseInt(edge.node.timestamp);
      
      // Keep only the latest transaction for each chat (already ordered DESC by timestamp)
      if (!chatTransactions.has(chatId)) {
        chatTransactions.set(chatId, edge);
        console.log('✅ Added chat to results:', chatId);
      }
    }

    console.log(`📋 Found ${chatTransactions.size} unique chats after deduplication`);

    console.log(`🔍 Processing ${chatTransactions.size} unique active chats`);

    // Fetch chat data for each unique active chat
    const chats = [];
    for (const [chatId, edge] of chatTransactions) {
      try {
        const transaction = edge.node;
        console.log(`📥 Fetching data for chat ${chatId} from transaction ${transaction.id}`);
        
        // Fetch the actual chat data from Irys
        const dataResponse = await fetch(`https://gateway.irys.xyz/${transaction.id}`);
        if (!dataResponse.ok) {
          console.error(`❌ Failed to fetch chat data for ${chatId}:`, dataResponse.status);
          continue;
        }
        
        const chatDataText = await dataResponse.text();
        const chatData = JSON.parse(chatDataText);
        
        // Extract metadata from tags
        const tags = transaction.tags;
        const createdAtTag = tags.find((tag: any) => tag.name === 'Created-At')?.value;
        const updatedAtTag = tags.find((tag: any) => tag.name === 'Updated-At')?.value;
        const deletedAtTag = tags.find((tag: any) => tag.name === 'Deleted-At')?.value;
        const isDeletedTag = tags.find((tag: any) => tag.name === 'Is-Deleted')?.value;
        
        // Convert timestamps to Date objects
        if (createdAtTag) {
          chatData.createdAt = new Date(createdAtTag);
        }
        if (updatedAtTag) {
          chatData.updatedAt = new Date(updatedAtTag);
        }
        if (deletedAtTag) {
          chatData.deletedAt = new Date(deletedAtTag);
        }
        
        // Set isDeleted flag (should always be false for active chats)
        chatData.isDeleted = isDeletedTag === 'true';
        
        // Double-check: skip if somehow a deleted chat got through
        if (chatData.isDeleted) {
          console.log('⚠️ Unexpected deleted chat found, skipping:', chatId);
          continue;
        }
        
        // Add irysId to chat data
        chatData.irysId = transaction.id;
        
        console.log(`✅ Successfully processed active chat ${chatId}`);
        chats.push(chatData);
        
      } catch (error) {
        console.error(`❌ Error processing chat ${chatId}:`, error);
      }
    }

    // Sort chats by updatedAt (most recent first)
    chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    console.log(`🎉 Successfully loaded ${chats.length} chats for user`);
    
    return NextResponse.json({
      success: true,
      chats,
      count: chats.length
    });

  } catch (error) {
    console.error('❌ Error loading chats from Irys:', error);
    return NextResponse.json(
      { error: 'Failed to load chats from Irys', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}