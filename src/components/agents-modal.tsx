"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Bot, Search, Plus } from "lucide-react"
import { useAgents } from "@/contexts/agents-context"
import { CreateAgentDialog } from "@/components/create-agent-dialog"

interface AgentsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectAgent?: (agentId: string | null) => void
}

export function AgentsModal({ open, onOpenChange, onSelectAgent }: AgentsModalProps) {
  const { agents, addAgent } = useAgents()
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectAgent = (agentId: string | null) => {
    onSelectAgent?.(agentId)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="p-6 pb-4 pr-16">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">Select Agent</DialogTitle>
              <Button
                onClick={() => setShowCreateDialog(true)}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
          </DialogHeader>
          
          <div className="px-6 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search Agents"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          <div className="px-6 pb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">DataChat Agents</h3>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {/* Default Chat Option */}
              <button
                onClick={() => handleSelectAgent(null)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Default Chat</div>
                  <div className="text-sm text-gray-500">Standard AI assistant</div>
                </div>
              </button>

              {/* Custom Agents */}
              {filteredAgents.map((agent) => {
                const colors = [
                  'from-blue-500 to-purple-600',
                  'from-green-500 to-teal-600', 
                  'from-orange-500 to-red-600',
                  'from-pink-500 to-rose-600',
                  'from-indigo-500 to-blue-600'
                ]
                const colorClass = colors[agent.id.charCodeAt(0) % colors.length]
                
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className={`w-10 h-10 bg-gradient-to-br ${colorClass} rounded-lg flex items-center justify-center`}>
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className="text-sm text-gray-500 truncate">
                        {agent.description || 'Custom AI agent'}
                      </div>
                    </div>
                  </button>
                )
              })}
              
              {filteredAgents.length === 0 && searchQuery && (
                <div className="text-center py-8 text-gray-500">
                  <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No agents found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateAgentDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateAgent={async (agent) => {
          try {
            await addAgent(agent, agent.files)
            setShowCreateDialog(false)
          } catch (error) {
            console.error('Failed to create agent:', error)
            alert('Failed to create agent. Please make sure your wallet is connected and try again.')
          }
        }}
      />
    </>
  )
}