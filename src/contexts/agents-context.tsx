"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { irysManager } from "@/utils/irys-manager"
import { useAccount } from 'wagmi'

export interface Agent {
  id: string
  name: string
  description: string
  systemPrompt: string
  createdAt: Date
  irysId?: string
  deleted?: boolean
  deletedAt?: string
}

interface AgentsContextType {
  agents: Agent[]
  addAgent: (agent: Omit<Agent, 'id' | 'createdAt' | 'irysId' | 'deleted'>) => Promise<void>
  removeAgent: (id: string) => Promise<void>
  getAgent: (id: string) => Agent | undefined
  loadUserAgents: () => Promise<void>
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
      
      // Try optimized loading first, fallback to regular if needed
      try {
        const result = await irysManager.loadUserAgentsOptimized(address)
        setAgents(result.agents)
        
        console.log(`✅ Loaded ${result.agents.length} agents with optimization:`, {
          mutableUrlUsage: result.optimization.mutableUrlUsage,
          optimizationPercentage: result.optimization.optimizationPercentage
        })
      } catch (optimizedError) {
        console.warn('⚠️ Optimized loading failed, falling back to regular method:', optimizedError)
        const userAgents = await irysManager.loadUserAgents(address)
        setAgents(userAgents)
        console.log(`✅ Loaded ${userAgents.length} agents via fallback method`)
      }
    } catch (error) {
      console.error('❌ Failed to load user agents:', error)
      // Don't throw error, just log it and keep empty agents array
      setAgents([])
    } finally {
      setIsLoading(false)
    }
  }

  const addAgent = async (agentData: Omit<Agent, 'id' | 'createdAt' | 'irysId' | 'deleted'>) => {
    const newAgent: Agent = {
      ...agentData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      deleted: false
    }

    // Only save to Irys if wallet is connected
    if (isConnected && address) {
      try {
        console.log('💾 Saving agent with optimization:', newAgent.name)
        
        // Try optimized saving first, fallback to regular if needed
        try {
          const result = await irysManager.saveAgentOptimized(newAgent, address)
          newAgent.irysId = result.irysId
          
          console.log('✅ Agent saved with optimization:', {
            irysId: result.irysId,
            mutableUrl: result.mutableUrl,
            isUpdate: result.isUpdate
          })
        } catch (optimizedError) {
          console.warn('⚠️ Optimized saving failed, falling back to regular method:', optimizedError)
          const irysId = await irysManager.saveAgent(newAgent)
          newAgent.irysId = irysId
          console.log('✅ Agent saved via fallback method with ID:', irysId)
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
          
          // Try optimized saving first, fallback to regular if needed
          try {
            const result = await irysManager.saveAgentOptimized(deletedAgent, address)
            console.log('✅ Agent deletion status updated with optimization:', {
              irysId: result.irysId,
              mutableUrl: result.mutableUrl
            })
          } catch (optimizedError) {
            console.warn('⚠️ Optimized deletion update failed, falling back to regular method:', optimizedError)
            await irysManager.saveAgent(deletedAgent)
            console.log('✅ Agent deletion status updated via fallback method')
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

  return (
    <AgentsContext.Provider value={{ 
      agents, 
      addAgent, 
      removeAgent, 
      getAgent,
      loadUserAgents,
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