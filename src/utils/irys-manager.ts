import { WebUploader } from '@irys/web-upload';
import { WebArbitrum } from '@irys/web-upload-ethereum';
import { EthersV6Adapter } from '@irys/web-upload-ethereum-ethers-v6';
import { ethers } from 'ethers';
const { BrowserProvider } = ethers;
import streamifier from 'streamifier';

class IrysManager {
  private irys: any = null;
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) {
      console.log('♻️ Using existing Irys instance');
      return this.irys;
    }

    try {
      console.log('🔧 Initializing Irys connection...');
      // Check if wallet is connected
      if (!window.ethereum) {
        console.error('❌ MetaMask not found');
        throw new Error('No Ethereum wallet found');
      }
      console.log('✅ MetaMask detected');

      // Create provider for Arbitrum mainnet with custom RPC
      const rpcUrl = process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
      console.log('🌐 Using RPC URL:', rpcUrl);
      
      const provider = new BrowserProvider(window.ethereum);
      console.log('🔗 Ethereum provider created');
      
      // Initialize Irys with WebArbitrum and EthersV6Adapter
      this.irys = await WebUploader(WebArbitrum)
        .withAdapter(EthersV6Adapter(provider))
        .withRpc(rpcUrl);
      console.log('🎯 Irys WebUploader initialized with Arbitrum and custom config');
      
      this.isInitialized = true;
      return this.irys;
    } catch (error) {
      console.error('❌ Failed to initialize Irys:', error);
      throw error;
    }
  }

  async saveAgent(agent: any) {
    try {
      console.log('🚀 Starting agent save process:', agent.name);
      
      // Check network connectivity first
      if (!navigator.onLine) {
        throw new Error('No internet connection available');
      }
      
      const irys = await this.initialize();
      console.log('✅ Irys initialized successfully');
      
      // Convert agent to JSON
      const agentData = JSON.stringify(agent, null, 2);
      console.log('📝 Agent data prepared:', {
        name: agent.name,
        id: agent.id,
        promptLength: agent.systemPrompt?.length || 0,
        dataSize: agentData.length,
        deleted: agent.deleted || false
      });
      
      // Create tags for the agent
      const tags = [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name', value: 'ChatAppAgents' },
        { name: 'Agent-Name', value: agent.name },
        { name: 'Agent-ID', value: agent.id },
        { name: 'Created-At', value: agent.createdAt.toISOString() },
        { name: 'Type', value: 'agent-prompt' },
        { name: 'Deleted', value: agent.deleted ? 'true' : 'false' }
      ];
      console.log('🏷️ Tags created:', tags);

      // Convert string to buffer and create stream
      const buffer = Buffer.from(agentData, 'utf8');
      const stream = streamifier.createReadStream(buffer);
      console.log('📦 Buffer and stream created, size:', buffer.length, 'bytes');
      
      // Upload stream to Irys
      console.log('⬆️ Starting upload to Irys...');
      const receipt = await irys.upload(stream, { tags });
      console.log('🎉 Upload successful! Irys ID:', receipt.id);
      console.log('📋 Full receipt:', receipt);
      
      return receipt.id;
    } catch (error) {
      console.error('❌ Error saving agent to Irys:', error);
      throw error;
    }
  }

  // Optimized agent saving using mutable references
  async saveAgentOptimized(agent: any, userAddress: string) {
    try {
      console.log('🚀 Starting optimized agent save:', agent.name);
      
      const response = await fetch('/api/save-agent-optimized', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...agent,
          userAddress
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save agent');
      }
      
      const result = await response.json();
      console.log('✅ Optimized agent save successful:', result);
      
      return {
        irysId: result.irysId,
        mutableUrl: result.mutableUrl,
        isUpdate: result.isUpdate,
        rootTxId: result.rootTxId
      };
    } catch (error) {
      console.error('❌ Error in optimized agent save:', error);
      throw error;
    }
  }

  async loadAgent(irysId: string) {
    try {
      console.log('📥 Loading agent from Irys ID:', irysId);
      
      // Fetch data from Irys
      const response = await fetch(`https://gateway.irys.xyz/${irysId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch agent: ${response.statusText}`);
      }
      
      const agentData = await response.json();
      console.log('✅ Agent loaded successfully:', agentData.name);
      
      return agentData;
    } catch (error) {
      console.error('❌ Error loading agent from Irys:', error);
      throw error;
    }
  }

  async getBalance() {
    try {
      const irys = await this.initialize();
      const balanceAtomic = await irys.getLoadedBalance();
      return irys.utils.fromAtomic(balanceAtomic);
    } catch (error) {
      console.error('Error getting Irys balance:', error);
      throw error;
    }
  }

  async fundIrys(amount: string) {
    try {
      const irys = await this.initialize();
      const atomicAmount = irys.utils.toAtomic(amount);
      const receipt = await irys.fund(atomicAmount, 1.2); // Using multiplier 1.2 like in ipfs project
      return receipt;
    } catch (error) {
      console.error('Error funding Irys:', error);
      throw error;
    }
  }

  async loadUserAgents(userAddress: string) {
    try {
      console.log('🔍 Loading agents for user:', userAddress);
      
      // GraphQL query to find ALL agent transactions by this user (including deleted ones)
      const query = `
        query getUserAgents($owner: String!) {
          transactions(
            owners: [$owner]
            tags: [
              { name: "App-Name", values: ["ChatAppAgents"] }
              { name: "Type", values: ["agent-prompt"] }
            ]
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
        owner: userAddress
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
      console.log(`📋 Found ${transactions.length} agent transactions`);

      // Group transactions by Agent-ID to find the latest version of each agent
      const agentTransactions = new Map<string, any>();
      
      for (const edge of transactions) {
        const agentIdTag = edge.node.tags.find((tag: any) => tag.name === 'Agent-ID');
        if (agentIdTag) {
          const agentId = agentIdTag.value;
          const timestamp = parseInt(edge.node.timestamp);
          
          // Keep only the latest transaction for each agent
          if (!agentTransactions.has(agentId) || 
              timestamp > parseInt(agentTransactions.get(agentId).node.timestamp)) {
            agentTransactions.set(agentId, edge);
          }
        }
      }

      console.log(`📋 Found ${agentTransactions.size} unique agents after deduplication`);

      // Load agent data for each latest transaction and filter out deleted ones
      const agents = [];
      for (const [agentId, edge] of agentTransactions) {
        try {
          const irysId = edge.node.id;
          console.log('📥 Loading agent data for transaction:', irysId);
          
          const agentData = await this.loadAgent(irysId);
          
          // Skip deleted agents
          if (agentData.deleted === true) {
            console.log('🗑️ Skipping deleted agent:', agentData.name);
            continue;
          }
          
          // Add irysId to agent data
          agentData.irysId = irysId;
          
          // Convert createdAt string back to Date object
          if (agentData.createdAt) {
            agentData.createdAt = new Date(agentData.createdAt);
          }
          
          agents.push(agentData);
          console.log('✅ Agent loaded:', agentData.name);
        } catch (error) {
          console.warn('⚠️ Failed to load agent data for transaction:', edge.node.id, error);
          // Continue with other agents even if one fails
        }
      }

      console.log(`🎉 Successfully loaded ${agents.length} active agents for user`);
      return agents;
    } catch (error) {
      console.error('❌ Error loading user agents:', error);
      throw error;
    }
  }
  // Optimized agent loading using mutable references
  async loadUserAgentsOptimized(userAddress: string) {
    try {
      console.log('🚀 Starting optimized agents load for user:', userAddress);
      
      const response = await fetch(`/api/load-agents-optimized?userAddress=${encodeURIComponent(userAddress)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load agents');
      }
      
      const result = await response.json();
      console.log('✅ Optimized agents load successful:', {
        totalAgents: result.agents.length,
        optimization: result.optimization
      });
      
      return {
        agents: result.agents,
        metadata: result.metadata,
        optimization: result.optimization
      };
    } catch (error) {
      console.error('❌ Error in optimized agents load:', error);
      throw error;
    }
  }
}

export const irysManager = new IrysManager();