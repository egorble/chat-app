"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bot, Plus, Search, Trash2, Loader2 } from "lucide-react"
import { CreateAgentDialog } from "@/components/create-agent-dialog"
import { useAgents } from "@/contexts/agents-context"

export function AgentsInterface() {
  const { agents, addAgent, removeAgent, isLoading } = useAgents()

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">My Agents</h1>
            <p className="text-gray-600 mt-4">Your trusted sidekicks for automating tasks and supercharging productivity.</p>
          </div>
          <CreateAgentDialog onCreateAgent={addAgent} />
        </div>

        {/* My Agents Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">My Created Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                <Loader2 className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
                <p>Loading your agents from blockchain...</p>
              </div>
            ) : agents.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No agents created yet. Create your first agent to get started!</p>
              </div>
            ) : (
              agents.map((agent) => {
                const agentSlug = agent.name.toLowerCase().replace(/\s+/g, '-')
                return (
                  <Card key={agent.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bot className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-base font-semibold text-gray-900 truncate">{agent.name}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">@{agentSlug}</Badge>
                              {agent.irysId && (
                                <a 
                                  href={`https://gateway.irys.xyz/${agent.irysId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-md hover:bg-orange-100 hover:text-orange-700 transition-colors duration-200"
                                  title="View agent on Irys blockchain"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  View on Irys
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            try {
                              await removeAgent(agent.id)
                            } catch (error) {
                              console.error('Failed to remove agent:', error)
                              alert('Failed to remove agent. Please make sure your wallet is connected.')
                            }
                          }}
                          className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <CardDescription className="text-sm text-gray-600 mt-1">
                        {agent.description || 'Custom AI agent'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">System Prompt:</span>
                        </div>
                        <p className="text-gray-600 leading-relaxed line-clamp-3">{agent.systemPrompt}</p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}