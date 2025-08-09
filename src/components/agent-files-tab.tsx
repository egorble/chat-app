"use client"

import React from 'react'
import { AgentFileManager } from '@/components/agent-file-manager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Files } from 'lucide-react'

interface AgentFilesTabProps {
  agentId: string
  agentName: string
  className?: string
}

export function AgentFilesTab({ agentId, agentName, className }: AgentFilesTabProps) {
  return (
    <div className={className}>
      <AgentFileManager agentId={agentId} />
    </div>
  )
}

// Simplified version for embedding in other components
export function AgentFilesSection({ agentId, agentName }: { agentId: string; agentName: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Files className="h-5 w-5" />
          <span>File Context</span>
        </CardTitle>
        <CardDescription>
          Upload files to provide additional context for {agentName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AgentFileManager agentId={agentId} />
      </CardContent>
    </Card>
  )
}