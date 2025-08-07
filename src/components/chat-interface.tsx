"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Paperclip, Search, Lightbulb, Wrench, Mic, MoreHorizontal, Moon, Sun, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useAgents } from "@/contexts/agents-context"
import { useChatHistory } from "@/contexts/chat-history-context"
import { AgentsModal } from "@/components/agents-modal"
import { useAccount } from "wagmi"

// Create the colorful logo component
function ChatLogo() {
  return (
    <div className="flex items-center justify-center mb-8">
      <div className="relative">
        {/* Main logo with vibrant gradient blocks */}
        <div className="flex flex-col gap-0.5">
          <div className="flex gap-0.5">
            <div className="w-6 h-6 bg-gradient-to-br from-yellow-300 via-orange-400 to-orange-500 rounded-sm shadow-sm" />
            <div className="w-6 h-6 bg-gradient-to-br from-orange-400 via-red-400 to-red-500 rounded-sm shadow-sm" />
          </div>
          <div className="flex gap-0.5">
            <div className="w-6 h-6 bg-gradient-to-br from-orange-500 via-red-500 to-red-600 rounded-sm shadow-sm" />
            <div className="w-6 h-6 bg-gradient-to-br from-red-500 via-red-600 to-pink-600 rounded-sm shadow-sm" />
          </div>
          <div className="flex gap-0.5">
            <div className="w-6 h-6 bg-gradient-to-br from-red-600 via-pink-600 to-purple-600 rounded-sm shadow-sm" />
            <div className="w-6 h-6 bg-gradient-to-br from-pink-600 via-purple-600 to-purple-700 rounded-sm shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  )
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  agent?: string
}

export function ChatInterface() {
  const [isDark, setIsDark] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [showAgentsModal, setShowAgentsModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { agents, getAgent } = useAgents()
  const { currentChatId, updateChatTitle, saveMessagesToChat, getChatMessages, createNewChat, saveChatToIrys, loadChatsFromIrys } = useChatHistory()
  const { address, isConnected } = useAccount()

  const scrollToBottom = () => {
    setTimeout(() => {
      const messagesContainer = messagesEndRef.current?.parentElement
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      }
    }, 100)
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Save current messages when switching chats
  const prevChatIdRef = useRef<string | null>(null)
  const prevMessagesRef = useRef<Message[]>([])
  
  useEffect(() => {
    // Save messages from previous chat when switching
    if (prevChatIdRef.current && prevChatIdRef.current !== currentChatId && prevMessagesRef.current.length > 0) {
      // Save previous chat messages immediately
      saveMessagesToChat(prevChatIdRef.current, prevMessagesRef.current)
    }
    
    // Load messages for new chat (only if we're actually switching chats, not on initial load)
    if (currentChatId) {
      const chatMessages = getChatMessages(currentChatId)
      // Only update messages if we're switching from a different chat or if messages are empty
      if (prevChatIdRef.current !== currentChatId || messages.length === 0) {
        setMessages(chatMessages)
        prevMessagesRef.current = chatMessages
      }
    } else if (prevChatIdRef.current !== null) {
      // Only clear messages if we were previously in a chat
      setMessages([])
      prevMessagesRef.current = []
    }
    
    prevChatIdRef.current = currentChatId
  }, [currentChatId, saveMessagesToChat, getChatMessages, messages.length])

  // Load chats from Irys when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      console.log('🔗 Wallet connected, loading chats from Irys...')
      loadChatsFromIrys()
    }
  }, [isConnected, address, loadChatsFromIrys])

  // Auto-save messages when they change (only for current chat)
  useEffect(() => {
    if (currentChatId && messages.length > 0 && !isLoading) {
      // Update the ref to track current messages
      prevMessagesRef.current = messages
      
      // Debounced save
      const timeoutId = setTimeout(() => {
        saveMessagesToChat(currentChatId, messages)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [messages, currentChatId, saveMessagesToChat, isLoading])



  const sendMessage = async () => {
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    let agentToUse = null
    let agentName = undefined

    // Use selected agent if available
    if (selectedAgent) {
      agentToUse = agents.find(a => a.id === selectedAgent)
      if (agentToUse) {
        agentName = agentToUse.name
      }
    }

    // Create new chat if none exists (before adding message to state)
    let chatId = currentChatId
    if (!chatId) {
      chatId = createNewChat()
    }
    
    // Update chat title if this is the first message and we have a chat
    if (chatId && messages.length === 0) {
      const title = userMessage.length > 50 ? userMessage.substring(0, 50) + '...' : userMessage
      updateChatTitle(chatId, title)
    }

    // Add user message to current messages
    const newMessages = [...messages, { 
      role: 'user' as const, 
      content: userMessage,
      agent: agentName 
    }]
    setMessages(newMessages)
    setMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
          systemPrompt: agentToUse?.systemPrompt 
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      // Add empty assistant message
      const assistantMessageIndex = newMessages.length
      setMessages(prev => [...prev, { role: 'assistant' as const, content: '' }])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.content) {
                  assistantMessage += data.content
                  setMessages(prev => {
                    const newMessages = [...prev]
                    if (newMessages.length > assistantMessageIndex) {
                      newMessages[assistantMessageIndex].content = assistantMessage
                    }
                    return newMessages
                  })
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => {
        // Only add error message if we don't already have an assistant message
        const hasAssistantMessage = prev.length > 0 && prev[prev.length - 1].role === 'assistant'
        if (hasAssistantMessage) {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1].content = 'Sorry, there was an error processing your request.'
          return newMessages
        } else {
          return [...prev, { role: 'assistant' as const, content: 'Sorry, there was an error processing your request.' }]
        }
      })
    } finally {
      setIsLoading(false)
      // Ensure scroll to bottom after message is sent
      scrollToBottom()
      // Save messages after sending will be handled by useEffect
      
      // Save chat to Irys after assistant response is complete
      if (currentChatId) {
        // Use setTimeout to ensure state has been updated
        setTimeout(() => {
          setMessages(currentMessages => {
            if (currentMessages.length > 0) {
              saveChatToIrys(currentChatId, currentMessages)
            }
            return currentMessages
          })
        }, 100)
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMessage(value)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-white">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Messages area */}
        {messages.length > 0 ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {msg.agent && (
                    <div className="flex items-center gap-1 mb-2 text-xs opacity-75">
                      <Bot className="w-3 h-3" />
                      <span>via {msg.agent}</span>
                    </div>
                  )}
                  {msg.role === 'assistant' ? (
                       <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-strong:text-gray-800 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-ul:list-disc prose-ol:list-decimal">
                         <ReactMarkdown 
                           components={{
                              code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={tomorrow as any}
                                    language={match[1]}
                                    PreTag="div"
                                    className="rounded-lg"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className="bg-gray-100 px-1 py-0.5 rounded text-sm" {...props}>
                                    {children}
                                  </code>
                                );
                              },
                            }}
                         >
                           {msg.content}
                         </ReactMarkdown>
                       </div>
                     ) : (
                       <p className="whitespace-pre-wrap">{msg.content}</p>
                     )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <ChatLogo />
            
            <div className="text-center mb-8">
              <h1 className="text-xl font-medium text-gray-600 mb-2">
                Ask Le Chat anything
              </h1>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Paperclip className="h-4 w-4" />
                Research
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Search className="h-4 w-4" />
                Think
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Wrench className="h-4 w-4" />
                Tools
              </Button>
            </div>
          </div>
        )}

        {/* Input area - always at bottom */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="w-full max-w-3xl mx-auto">
            <div className="relative">
              <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
                <Button 
                  onClick={() => setShowAgentsModal(true)}
                  size="sm" 
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-md px-3 py-1.5 text-sm font-medium flex items-center gap-1"
                >
                  {selectedAgent ? (
                    <>
                      <Bot className="w-3 h-3" />
                      {agents.find(a => a.id === selectedAgent)?.name || 'Ask'}
                    </>
                  ) : (
                    'Ask'
                  )}
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
                
                <div className="flex-1 relative">
                  <Input
                    value={message}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder={selectedAgent ? `Chatting with ${agents.find(a => a.id === selectedAgent)?.name}` : "Ask anything..."}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm px-0"
                    disabled={isLoading}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={sendMessage}
                    disabled={!message.trim() || isLoading}
                    variant="ghost" 
                    size="sm" 
                    className="p-1.5"
                  >
                    <Send className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <AgentsModal 
        open={showAgentsModal}
        onOpenChange={setShowAgentsModal}
        onSelectAgent={setSelectedAgent}
      />
    </div>
  )
}