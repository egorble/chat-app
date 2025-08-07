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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <CardTitle className="text-sm font-medium">{agent.name}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="secondary" className="text-xs">@{agentSlug}</Badge>
                          {agent.irysId && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                              ⛓️ Blockchain
                            </Badge>
                          )}
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
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription className="text-xs text-gray-600">
                        {agent.description || 'Custom AI agent'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded text-left">
                        <span className="font-medium">System Prompt:</span>
                        <p className="mt-1 line-clamp-2">{agent.systemPrompt}</p>
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