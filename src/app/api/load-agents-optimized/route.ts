import { NextRequest, NextResponse } from 'next/server';

// Optimized load-agents API using Irys mutable references
// This provides faster loading and better performance

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Missing required parameter: userAddress' },
        { status: 400 }
      );
    }

    console.log('🔍 Loading optimized agents for user:', userAddress);

    // GraphQL query to find ALL agent transactions by this user
    const query = `
      query getUserAgents($userAddress: String!) {
        transactions(
          tags: [
            {
              name: "App-Name"
              values: ["ChatAppAgents"]
            },
            {
              name: "Type"
              values: ["agent-prompt"]
            },
            {
              name: "User-Address"
              values: [$userAddress]
            },
            {
              name: "Optimization"
              values: ["mutable-reference"]
            }
          ]
          order: DESC
          first: 200
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
      userAddress
    };

    console.log('📡 Executing GraphQL query for optimized agents');

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
    console.log('📊 GraphQL response received');

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const transactions = result.data?.transactions?.edges || [];
    console.log(`📋 Found ${transactions.length} agent transactions`);

    // Group transactions by Agent-ID to find root transactions and latest versions
    const agentTransactions = new Map<string, any>();
    const rootTransactions = new Map<string, string>(); // agentId -> rootTxId
    
    for (const edge of transactions) {
      const agentIdTag = edge.node.tags.find((tag: any) => tag.name === 'Agent-ID');
      const rootTxTag = edge.node.tags.find((tag: any) => tag.name === 'Root-TX');
      
      if (agentIdTag) {
        const agentId = agentIdTag.value;
        const timestamp = parseInt(edge.node.timestamp);
        
        // Track root transaction for this agent
        if (rootTxTag) {
          rootTransactions.set(agentId, rootTxTag.value);
        } else if (!rootTransactions.has(agentId)) {
          // This transaction is the root (no Root-TX tag)
          rootTransactions.set(agentId, edge.node.id);
        }
        
        // Keep only the latest transaction for each agent
        if (!agentTransactions.has(agentId) || 
            timestamp > parseInt(agentTransactions.get(agentId).node.timestamp)) {
          agentTransactions.set(agentId, edge);
        }
      }
    }

    console.log(`📋 Found ${agentTransactions.size} unique agents after deduplication`);

    // Load agent data using mutable URLs with fallback
    const agents = [];
    const loadingStats = {
      mutableUrlSuccess: 0,
      fallbackUsed: 0,
      totalAttempts: 0
    };

    for (const [agentId, edge] of agentTransactions) {
      try {
        loadingStats.totalAttempts++;
        const rootTxId = rootTransactions.get(agentId);
        const latestTxId = edge.node.id;
        
        console.log(`📥 Loading agent ${agentId}:`, { rootTxId, latestTxId });
        
        let agentData = null;
        let loadingMethod = 'unknown';
        
        // Try mutable URL first (if we have a root transaction)
        if (rootTxId) {
          try {
            const mutableUrl = `https://gateway.irys.xyz/mutable/${rootTxId}`;
            console.log(`🔗 Trying mutable URL: ${mutableUrl}`);
            
            const mutableResponse = await fetch(mutableUrl);
            if (mutableResponse.ok) {
              agentData = await mutableResponse.json();
              loadingMethod = 'mutable-url';
              loadingStats.mutableUrlSuccess++;
              console.log('✅ Loaded via mutable URL');
            } else {
              console.log('⚠️ Mutable URL failed, trying fallback');
              throw new Error('Mutable URL failed');
            }
          } catch (mutableError) {
            console.log('🔄 Falling back to direct transaction access');
            // Fallback to direct transaction access
            const directUrl = `https://gateway.irys.xyz/${latestTxId}`;
            const directResponse = await fetch(directUrl);
            if (directResponse.ok) {
              agentData = await directResponse.json();
              loadingMethod = 'direct-access';
              loadingStats.fallbackUsed++;
              console.log('✅ Loaded via direct access');
            }
          }
        } else {
          // No root transaction, use direct access
          const directUrl = `https://gateway.irys.xyz/${latestTxId}`;
          const directResponse = await fetch(directUrl);
          if (directResponse.ok) {
            agentData = await directResponse.json();
            loadingMethod = 'direct-access';
            loadingStats.fallbackUsed++;
            console.log('✅ Loaded via direct access (no root)');
          }
        }
        
        if (agentData) {
          // Skip deleted agents
          if (agentData.deleted === true) {
            console.log('🗑️ Skipping deleted agent:', agentData.name);
            continue;
          }
          
          // Add metadata
          agentData.irysId = latestTxId;
          agentData.mutableUrl = rootTxId ? `https://gateway.irys.xyz/mutable/${rootTxId}` : null;
          agentData.loadingMethod = loadingMethod;
          agentData.rootTxId = rootTxId;
          
          // Convert createdAt string back to Date object
          if (agentData.createdAt) {
            agentData.createdAt = new Date(agentData.createdAt);
          }
          
          agents.push(agentData);
          console.log('✅ Agent loaded:', agentData.name);
        }
      } catch (error) {
        console.warn('⚠️ Failed to load agent data for:', agentId, error);
        // Continue with other agents even if one fails
      }
    }

    // Calculate optimization metrics
    const optimizationPercentage = loadingStats.totalAttempts > 0 
      ? (loadingStats.mutableUrlSuccess / loadingStats.totalAttempts * 100).toFixed(1)
      : '0.0';

    console.log(`🎉 Successfully loaded ${agents.length} active agents for user`);
    console.log('📊 Loading stats:', loadingStats);
    console.log(`🚀 Optimization: ${optimizationPercentage}% mutable URL usage`);

    return NextResponse.json({
      success: true,
      agents,
      metadata: {
        totalTransactions: transactions.length,
        uniqueAgents: agentTransactions.size,
        activeAgents: agents.length,
        userAddress,
        timestamp: new Date().toISOString()
      },
      optimization: {
        type: 'mutable-reference',
        mutableUrlUsage: loadingStats.mutableUrlSuccess,
        fallbackUsage: loadingStats.fallbackUsed,
        totalAttempts: loadingStats.totalAttempts,
        optimizationPercentage: `${optimizationPercentage}%`,
        benefits: [
          'Faster loading through mutable URLs',
          'Reduced GraphQL complexity',
          'Automatic latest version access',
          'Fallback reliability'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Error loading agents:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load agents',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}