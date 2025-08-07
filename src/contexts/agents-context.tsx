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
      console.log('🔄 Loading user agents from Irys...')
      
      const userAgents = await irysManager.loadUserAgents(address)
      setAgents(userAgents)
      
      console.log(`✅ Loaded ${userAgents.length} agents from Irys`)
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
    if (isConnected) {
      try {
        console.log('💾 Saving agent to Irys:', newAgent.name)
        const irysId = await irysManager.saveAgent(newAgent)
        newAgent.irysId = irysId
        console.log('✅ Agent saved to Irys with ID:', irysId)
        
      } catch (error: any) {
        console.error('❌ Failed to save agent to Irys:', error)
        
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
        throw error; // Don't add agent if Irys save fails
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

      // Try to save the deleted status to Irys if wallet is connected
      if (isConnected && agent.irysId) {
        try {
          console.log('💾 Updating agent deletion status in Irys')
          await irysManager.saveAgent(deletedAgent)
          console.log('✅ Agent deletion status updated in Irys')
        } catch (error) {
          console.error('❌ Failed to update deletion status in Irys:', error)
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