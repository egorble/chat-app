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

    // GraphQL query to find chat transactions by server wallet with user address filter
    const query = `
      query getUserChats($owner: String!) {
        transactions(
          owners: [$owner]
          tags: [
            { name: "App-Name", values: ["ChatAppChats"] }
            { name: "Type", values: ["chat-session"] }
            { name: "User-Address", values: ["${userAddress}"] }
          ]
          first: 100
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

    console.log('📡 Executing GraphQL query:', { query: query.replace(/\s+/g, ' ').trim(), variables });

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
    console.log('📊 GraphQL response:', result);

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const transactions = result.data?.transactions?.edges || [];
    console.log(`📋 Found ${transactions.length} chat transactions`);

    // Group transactions by Chat-ID to find the latest version of each chat
    const chatTransactions = new Map<string, any>();
    
    for (const edge of transactions) {
      const chatIdTag = edge.node.tags.find((tag: any) => tag.name === 'Chat-ID');
      if (chatIdTag) {
        const chatId = chatIdTag.value;
        const timestamp = parseInt(edge.node.timestamp);
        
        // Keep only the latest transaction for each chat
        if (!chatTransactions.has(chatId) || 
            timestamp > parseInt(chatTransactions.get(chatId).node.timestamp)) {
          chatTransactions.set(chatId, edge);
        }
      }
    }

    console.log(`📋 Found ${chatTransactions.size} unique chats after deduplication`);

    // Load chat data for each latest transaction
    const chats = [];
    for (const [chatId, edge] of chatTransactions) {
      try {
        const irysId = edge.node.id;
        console.log('📥 Loading chat data for transaction:', irysId);
        
        // Fetch data from Irys
        const chatResponse = await fetch(`https://gateway.irys.xyz/${irysId}`);
        if (!chatResponse.ok) {
          throw new Error(`Failed to fetch chat: ${chatResponse.statusText}`);
        }
        
        const chatData = await chatResponse.json();
        
        // Add irysId to chat data
        chatData.irysId = irysId;
        
        // Convert date strings back to Date objects
        if (chatData.createdAt) {
          chatData.createdAt = new Date(chatData.createdAt);
        }
        if (chatData.updatedAt) {
          chatData.updatedAt = new Date(chatData.updatedAt);
        }
        
        chats.push(chatData);
        console.log('✅ Chat loaded:', chatData.title);
      } catch (error) {
        console.warn('⚠️ Failed to load chat data for transaction:', edge.node.id, error);
        // Continue with other chats even if one fails
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