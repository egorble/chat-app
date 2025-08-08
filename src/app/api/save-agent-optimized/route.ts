import { NextRequest, NextResponse } from 'next/server';
import { Uploader } from '@irys/upload';
import { Ethereum } from '@irys/upload-ethereum';

// Optimized save-agent API using Irys mutable references
// This reduces blockchain transactions and improves performance

export async function POST(request: NextRequest) {
  try {
    const { id, name, description, systemPrompt, userAddress, deleted = false } = await request.json();

    // Validate required fields
    if (!id || !name || !systemPrompt || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, systemPrompt, userAddress' },
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

    // Check if this agent already exists by searching for existing transactions
    console.log('🔍 Checking for existing agent:', id);
    const existingAgentQuery = `
      query getExistingAgent {
        transactions(
          tags: [
            {
              name: "App-Name"
              values: ["ChatAppAgents"]
            },
            {
              name: "Agent-ID"
              values: ["${id}"]
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
        query: existingAgentQuery
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
      
      console.log('📝 Updating existing agent. Root TX:', rootTxId);
    } else {
      console.log('🆕 Creating new agent');
    }

    // Prepare agent data
    const agentData = {
      id,
      name,
      description,
      systemPrompt,
      userAddress,
      deleted,
      createdAt: isUpdate ? undefined : new Date().toISOString(), // Only set on creation
      updatedAt: new Date().toISOString(),
      deletedAt: deleted ? new Date().toISOString() : undefined
    };

    // Remove undefined fields
    Object.keys(agentData).forEach(key => {
      if (agentData[key as keyof typeof agentData] === undefined) {
        delete agentData[key as keyof typeof agentData];
      }
    });

    // Prepare tags
    const baseTags = [
      { name: "App-Name", value: "ChatAppAgents" },
      { name: "Type", value: "agent-prompt" },
      { name: "User-Address", value: userAddress },
      { name: "Agent-ID", value: id },
      { name: "Agent-Name", value: name },
      { name: "Updated-At", value: agentData.updatedAt },
      { name: "Deleted", value: deleted ? 'true' : 'false' },
      { name: "Optimization", value: "mutable-reference" }
    ];

    // Add Root-TX tag for updates
    if (isUpdate && rootTxId) {
      baseTags.push({ name: "Root-TX", value: rootTxId });
    } else if (!isUpdate) {
      // Add creation timestamp only for new agents
      baseTags.push({ name: "Created-At", value: agentData.createdAt! });
    }

    // Add deletion timestamp if agent is being deleted
    if (deleted && agentData.deletedAt) {
      baseTags.push({ name: "Deleted-At", value: agentData.deletedAt });
    }

    // Upload to Irys
    console.log(`⬆️ ${isUpdate ? 'Updating' : 'Creating'} agent on Irys...`);
    const receipt = await irysUploader.upload(JSON.stringify(agentData, null, 2), { tags: baseTags });
    
    console.log('✅ Agent saved successfully!');
    console.log('🆔 Transaction ID:', receipt.id);
    
    // Determine the mutable URL
    const mutableTxId = rootTxId || receipt.id; // Use root for updates, current for new agents
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
          ? 'Agent updated using mutable reference - single URL for all versions'
          : 'New agent created with mutable reference support',
        benefits: [
          'Reduced blockchain transactions',
          'Consistent URL for all versions',
          'Faster loading through single endpoint',
          'Simplified version management'
        ]
      },
      metadata: {
        agentId: id,
        name,
        description,
        deleted,
        userAddress,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error saving agent:', error);
    return NextResponse.json(
      { 
        error: 'Failed to save agent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}