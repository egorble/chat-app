"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useAccount } from 'wagmi'
import { FileAttachment, FileContext } from "@/types/file-types"

export interface Agent {
  id: string
  name: string
  description: string
  systemPrompt: string
  createdAt: Date
  irysId?: string
  deleted?: boolean
  deletedAt?: string
  fileContext?: FileContext
}

interface AgentsContextType {
  agents: Agent[]
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'irysId' | 'deleted'>, files?: FileAttachment[]) => Promise<void>
  removeAgent: (id: string) => Promise<void>
  getAgent: (id: string) => Agent | undefined
  loadUserAgents: () => Promise<void>
  addFileToAgent: (agentId: string, file: FileAttachment) => Promise<void>
  removeFileFromAgent: (agentId: string, fileId: string) => Promise<void>
  getAgentFiles: (agentId: string) => FileAttachment[]
  isLoading: boolean
}

const AgentsContext = createContext<AgentsContextType | undefined>(undefined)

export function AgentsProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { isConnected, address } = useAccount()

  // Load user agents when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      loadUserAgents()
    } else {
      setAgents([])
    }
  }, [isConnected, address])

  const loadUserAgents = async () => {
    if (!isConnected || !address) {
      console.log('⚠️ Wallet not connected, cannot load agents')
      return
    }

    try {
      setIsLoading(true)
      console.log('🔄 Loading user agents with optimization...')
      
      // Load agents using server API
      try {
        const response = await fetch(`/api/load-agents-optimized?userAddress=${encodeURIComponent(address)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load agents');
        }
        
        const result = await response.json();
        setAgents(result.agents);
        
        console.log(`✅ Loaded ${result.agents.length} agents successfully:`, {
          mutableUrlUsage: result.optimization?.mutableUrlUsage,
          optimizationPercentage: result.optimization?.optimizationPercentage
        });
      } catch (loadError) {
        console.error('❌ Failed to load agents via API:', loadError);
        throw loadError;
      }
    } catch (error) {
      console.error('❌ Failed to load user agents:', error)
      // Don't throw error, just log it and keep empty agents array
      setAgents([])
    } finally {
      setIsLoading(false)
    }
  }

  const addAgent = async (agentData: Omit<Agent, 'id' | 'createdAt' | 'irysId' | 'deleted'>, files?: FileAttachment[]) => {
    const newAgent: Agent = {
      ...agentData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      deleted: false,
      fileContext: files && files.length > 0 ? {
        files: files,
        totalSize: files.reduce((sum, file) => sum + file.size, 0),
        maxFiles: 20,
        allowedTypes: ['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'json', 'js', 'ts', 'py']
      } : undefined
    }

    // Only save to Irys if wallet is connected
    if (isConnected && address) {
      try {
        console.log('💾 Saving agent with optimization:', newAgent.name)
        
        // Save agent using server API
        try {
          const response = await fetch('/api/save-agent-optimized', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...newAgent,
              userAddress: address
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save agent');
          }
          
          const result = await response.json();
          newAgent.irysId = result.transactionId;
          
          console.log('✅ Agent saved successfully:', {
            irysId: result.transactionId,
            mutableUrl: result.mutableUrl,
            isUpdate: result.isUpdate
          });
        } catch (saveError) {
          console.error('❌ Failed to save agent via API:', saveError);
          throw saveError;
        }
        
      } catch (error: any) {
        console.error('❌ Failed to save agent:', error)
        
        // Provide user-friendly error messages
        let errorMessage = 'Failed to save to blockchain';
        if (error.message?.includes('Network Error')) {
          errorMessage = 'Network connection failed.';
        } else if (error.message?.includes('No internet connection')) {
          errorMessage = 'No internet connection.';
        } else if (error.message?.includes('No Ethereum wallet')) {
          errorMessage = 'Wallet not found.';
        }
        
        console.warn('⚠️', errorMessage);
        throw error; // Don't add agent if save fails
      }
    } else {
      console.log('⚠️ Wallet not connected, cannot save agent')
      throw new Error('Wallet not connected')
    }

    setAgents(prev => [...prev, newAgent])
  }

  const removeAgent = async (id: string): Promise<void> => {
    try {
      console.log('🗑️ Removing agent:', id)
      
      const agent = agents.find(a => a.id === id)
      if (!agent) {
        console.warn('⚠️ Agent not found:', id)
        return
      }

      // Mark as deleted and add deletedAt timestamp
      const deletedAgent = {
        ...agent,
        deleted: true,
        deletedAt: new Date()
      }

      // Try to save the deleted status using optimized method if wallet is connected
      if (isConnected && address && agent.irysId) {
        try {
          console.log('💾 Updating agent deletion status with optimization')
          
          // Save deleted agent using server API
          try {
            const response = await fetch('/api/save-agent-optimized', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...deletedAgent,
                userAddress: address
              })
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to save deleted agent');
            }
            
            const result = await response.json();
            console.log('✅ Agent deletion status updated successfully:', {
              irysId: result.transactionId,
              mutableUrl: result.mutableUrl
            });
          } catch (deleteError) {
            console.error('❌ Failed to update deletion status via API:', deleteError);
            throw deleteError;
          }
        } catch (error) {
          console.error('❌ Failed to update deletion status:', error)
          throw error
        }
      } else {
        throw new Error('Cannot delete agent: wallet not connected or agent not saved to Irys')
      }
      
      // Remove from current state
      setAgents(prev => prev.filter(a => a.id !== id))
      console.log('✅ Agent removed from state')
      
    } catch (error) {
      console.error('❌ Error removing agent:', error)
      throw error
    }
  }

  const getAgent = (id: string) => {
    return agents.find(agent => agent.id === id)
  }

  const addFileToAgent = async (agentId: string, file: FileAttachment) => {
    try {
      const agent = agents.find(a => a.id === agentId)
      if (!agent) {
        throw new Error('Agent not found')
      }

      const updatedAgent = {
        ...agent,
        fileContext: {
          files: [...(agent.fileContext?.files || []), file],
          totalSize: (agent.fileContext?.totalSize || 0) + file.size,
          maxFiles: agent.fileContext?.maxFiles || 20,
          allowedTypes: agent.fileContext?.allowedTypes || []
        }
      }

      // Save updated agent to Irys if connected
      if (isConnected && address) {
        try {
          const response = await fetch('/api/save-agent-optimized', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...updatedAgent,
              userAddress: address
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save agent with file');
          }
          
          const result = await response.json();
          updatedAgent.irysId = result.transactionId;
        } catch (error) {
          console.warn('Failed to save agent with file via API:', error);
        }
      }

      setAgents(prev => prev.map(a => a.id === agentId ? updatedAgent : a))
    } catch (error) {
      console.error('Error adding file to agent:', error)
      throw error
    }
  }

  const removeFileFromAgent = async (agentId: string, fileId: string) => {
    try {
      const agent = agents.find(a => a.id === agentId)
      if (!agent || !agent.fileContext) {
        throw new Error('Agent or file context not found')
      }

      const fileToRemove = agent.fileContext.files.find(f => f.id === fileId)
      if (!fileToRemove) {
        throw new Error('File not found')
      }

      const updatedAgent = {
        ...agent,
        fileContext: {
          ...agent.fileContext,
          files: agent.fileContext.files.filter(f => f.id !== fileId),
          totalSize: agent.fileContext.totalSize - fileToRemove.size
        }
      }

      // Save updated agent to Irys if connected
      if (isConnected && address) {
        try {
          const response = await fetch('/api/save-agent-optimized', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...updatedAgent,
              userAddress: address
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save agent after file removal');
          }
          
          const result = await response.json();
          updatedAgent.irysId = result.transactionId;
        } catch (error) {
          console.warn('Failed to save agent after file removal via API:', error);
        }
      }

      setAgents(prev => prev.map(a => a.id === agentId ? updatedAgent : a))
    } catch (error) {
      console.error('Error removing file from agent:', error)
      throw error
    }
  }

  const getAgentFiles = (agentId: string): FileAttachment[] => {
    const agent = agents.find(a => a.id === agentId)
    return agent?.fileContext?.files || []
  }

  return (
    <AgentsContext.Provider value={{ 
      agents, 
      addAgent, 
      removeAgent, 
      getAgent,
      loadUserAgents,
      addFileToAgent,
      removeFileFromAgent,
      getAgentFiles,
      isLoading
    }}>
      {children}
    </AgentsContext.Provider>
  )
}

export function useAgents() {
  const context = useContext(AgentsContext)
  if (context === undefined) {
    throw new Error('useAgents must be used within an AgentsProvider')
  }
  return context
}