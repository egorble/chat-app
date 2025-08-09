"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  MessageSquare,
  Bot,
  Search,
  MoreHorizontal,
  Trash2,
  X
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useChatHistory } from "@/contexts/chat-history-context"
import { IrysSaveIndicator } from "@/components/irys-save-indicator"

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { chatSessions, currentChatId, selectChat, deleteChatSession } = useChatHistory()
  const { address, isConnected } = useAccount()
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // Filter chats by search query
  const filteredChatSessions = useMemo(() => {
    if (!searchQuery.trim()) {
      return chatSessions
    }
    
    const query = searchQuery.toLowerCase().trim()
    return chatSessions.filter(chat => {
      // Search by chat title
      const titleMatch = chat.title.toLowerCase().includes(query)
      
      // Search by last message
      const lastMessageMatch = chat.lastMessage?.toLowerCase().includes(query)
      
      // Search by message content
      const messagesMatch = chat.messages?.some(message => 
        message.content.toLowerCase().includes(query)
      )
      
      return titleMatch || lastMessageMatch || messagesMatch
    })
  }, [chatSessions, searchQuery])
  
  // Handle Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-sm text-gray-600">en</div>
          <div className="flex-1">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== 'loading'
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === 'authenticated')

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-md transition-colors"
                          >
                            Connect Wallet
                          </button>
                        )
                      }

                      return (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {account.displayName?.[0] || 'W'}
                            </span>
                          </div>
                          <button
                            onClick={openAccountModal}
                            type="button"
                            className="text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors"
                          >
                            {account.displayName}
                          </button>
                        </div>
                      )
                    })()} 
                  </div>
                )
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                 <SidebarMenuButton 
                   asChild 
                   isActive={pathname === '/'}
                   className="w-full justify-start gap-3 px-3 py-2 text-sm"
                 >
                   <Link href="/" className="flex items-center gap-3 w-full">
                     <MessageSquare className="h-4 w-4" />
                     <span className="flex-1">Chat</span>
                   </Link>
                 </SidebarMenuButton>
               </SidebarMenuItem>
               <SidebarMenuItem>
                 <SidebarMenuButton 
                   asChild 
                   isActive={pathname === '/agents'}
                   className="w-full justify-start gap-3 px-3 py-2 text-sm"
                 >
                   <Link href="/agents" className="flex items-center gap-3 w-full">
                     <Bot className="h-4 w-4" />
                     <span className="flex-1">Agents</span>
                     <Badge 
                       variant="secondary" 
                       className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5"
                     >
                       Beta
                     </Badge>
                   </Link>
                 </SidebarMenuButton>
               </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              ref={searchInputRef}
              placeholder="Search chats..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-8 bg-gray-50 border-0 text-sm"
            />
            {searchQuery && (
              <Button
                onClick={() => setSearchQuery("")}
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-200"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            {!searchQuery && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                Ctrl+K
              </div>
            )}
          </div>
          
          {/* Chat History Section */}
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-medium text-gray-500 mb-2">
              Chat History {searchQuery && `(${filteredChatSessions.length} found)`}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredChatSessions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {searchQuery ? (
                       <>
                         <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                         <p>Nothing found for "{searchQuery}"</p>
                         <p className="text-xs mt-1">Try a different search query</p>
                       </>
                     ) : (
                       <>
                         <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                         <p>No saved chats</p>
                         <p className="text-xs mt-1">Start a new chat to see it here</p>
                       </>
                     )}
                  </div>
                ) : (
                  filteredChatSessions.map((chat) => (
                    <SidebarMenuItem key={chat.id}>
                      <div className="flex items-center w-full group">
                        <SidebarMenuButton
                          onClick={() => {
                            selectChat(chat.id)
                            // Navigate to chat page if not already there
                            if (pathname !== '/') {
                              router.push('/')
                            }
                          }}
                          isActive={currentChatId === chat.id}
                          className="flex-1 justify-start px-3 py-2 text-sm hover:bg-gray-100"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <MessageSquare className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="truncate text-xs">{chat.title}</span>
                            <IrysSaveIndicator 
                              status={chat.irysSaveStatus || 'not_saved'} 
                              className="ml-auto flex-shrink-0"
                              size="sm"
                            />
                          </div>
                        </SidebarMenuButton>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm(`Are you sure you want to delete the chat "${chat.title}"?\n\nThis action cannot be undone.`)) {
                              deleteChatSession(chat.id)
                            }
                          }}
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
      

    </Sidebar>
  )
}