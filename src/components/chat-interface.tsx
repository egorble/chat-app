"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Paperclip, Search, Lightbulb, Wrench, Mic, MoreHorizontal, Moon, Sun, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import ReactMarkdown from "react-markdown"
import rehypeRaw from "rehype-raw"
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
    // Save messages from previous chat when switching (async to avoid setState during render)
    if (prevChatIdRef.current && prevChatIdRef.current !== currentChatId && prevMessagesRef.current.length > 0) {
      // Use setTimeout to defer the setState call and avoid "setState during render" error
      setTimeout(() => {
        saveMessagesToChat(prevChatIdRef.current!, prevMessagesRef.current)
      }, 0)
    }
    
    // Load messages for new chat (only if we're actually switching chats)
    if (currentChatId && prevChatIdRef.current !== currentChatId) {
      const chatMessages = getChatMessages(currentChatId)
      console.log(`🔄 Loading messages for chat ${currentChatId}:`, chatMessages.length, 'messages')
      console.log('🔄 Previous chat was:', prevChatIdRef.current)
      console.log('🔄 Current messages before switch:', messages.length)
      
      // Only load messages if the chat actually has saved messages
      // This prevents clearing messages for newly created chats
      if (chatMessages.length > 0 || messages.length === 0) {
        setMessages(chatMessages)
        prevMessagesRef.current = chatMessages
        console.log('🔄 Messages after switch:', chatMessages.length)
      } else {
        console.log('🔄 Keeping current messages for new chat')
      }
    } else if (!currentChatId && prevChatIdRef.current !== null) {
      // Only clear messages if we were previously in a chat and now have no chat
      console.log('🧹 Clearing messages - no current chat')
      setMessages([])
      prevMessagesRef.current = []
    }
    
    prevChatIdRef.current = currentChatId
  }, [currentChatId, saveMessagesToChat, getChatMessages])

  // Load chats from Irys when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      console.log('🔗 Wallet connected, loading chats from Irys...')
      loadChatsFromIrys()
    }
  }, [isConnected, address, loadChatsFromIrys])

  // Auto-save messages when they change (only for current chat) - disabled as we now use immediate saves
  // This prevents conflicts with immediate saves after user messages and AI responses
  /*
  useEffect(() => {
    if (currentChatId && messages.length > 0 && !isLoading) {
      // Check if messages actually changed from what we have saved
      const savedMessages = getChatMessages(currentChatId)
      const messagesChanged = messages.length !== savedMessages.length || 
        JSON.stringify(messages) !== JSON.stringify(savedMessages)
      
      if (messagesChanged) {
        // Update the ref to track current messages
        prevMessagesRef.current = messages
        
        console.log('💾 Auto-save triggered:', { chatId: currentChatId, messageCount: messages.length, isLoading })
        
        // Debounced save to local state
        const timeoutId = setTimeout(() => {
          console.log('💾 Executing auto-save to local state:', { chatId: currentChatId, messageCount: messages.length })
          saveMessagesToChat(currentChatId, messages)
        }, 500)
        return () => clearTimeout(timeoutId)
      }
    }
  }, [messages, currentChatId, saveMessagesToChat, getChatMessages, isLoading])
  */

  // Auto-save to Irys after each AI response (when loading stops and we have messages)
  const lastSavedMessageCountRef = useRef<number>(0)
  const wasLoadingRef = useRef<boolean>(false)
  
  useEffect(() => {
    // Track when loading changes from true to false (AI response completed)
    if (wasLoadingRef.current && !isLoading) {
      // Loading just finished - this is when we should save
      if (currentChatId && messages.length > 0 && address) {
        const lastMessage = messages[messages.length - 1]
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content.trim()) {
          // Only save if we have new messages (not just switching chats)
          if (messages.length > lastSavedMessageCountRef.current) {
            // Save to Irys after AI response
            const timeoutId = setTimeout(() => {
              console.log('💾 Auto-saving to Irys after AI response:', { chatId: currentChatId, messageCount: messages.length })
              saveChatToIrys(currentChatId, messages)
              lastSavedMessageCountRef.current = messages.length
            }, 1000) // Wait 1 second to ensure the response is complete
            return () => clearTimeout(timeoutId)
          }
        }
      }
    }
    wasLoadingRef.current = isLoading
  }, [isLoading, currentChatId, messages, address, saveChatToIrys])

  // Set saved message count when switching chats (only on chat change, not message change)
  useEffect(() => {
    if (currentChatId) {
      // Get current messages for this chat from context
      const chatMessages = getChatMessages(currentChatId)
      lastSavedMessageCountRef.current = chatMessages.length
      console.log('🔄 Set saved count for chat:', { chatId: currentChatId, messageCount: chatMessages.length, savedCount: lastSavedMessageCountRef.current })
    }
  }, [currentChatId, getChatMessages])



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
    let isNewChat = false
    if (!chatId) {
      chatId = createNewChat()
      isNewChat = true
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
    
    // For new chats, set messages immediately to prevent clearing by useEffect
    if (isNewChat) {
      setMessages(newMessages)
      // Also update the ref to prevent useEffect from clearing
      prevMessagesRef.current = newMessages
    } else {
      setMessages(newMessages)
    }
    
    // Immediately save the new messages to prevent loss during chat switching (async to avoid setState during render)
    if (chatId) {
      setTimeout(() => {
        saveMessagesToChat(chatId, newMessages)
        console.log('💾 Immediate save after user message:', { chatId, messageCount: newMessages.length })
      }, 0)
    }
    
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
          systemPrompt: agentToUse?.systemPrompt,
          conversationHistory: messages // Pass current conversation history for context
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
      
      // Check if assistant message is empty after streaming
      if (assistantMessage.trim() === '') {
        console.warn('⚠️ Empty assistant response detected, attempting retry...')
        
        // Try one more time with a retry request
        try {
          const retryResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: userMessage,
              conversationHistory: messages.slice(0, -1), // Exclude the empty assistant message
              systemPrompt: agentToUse?.systemPrompt || 'You are a helpful assistant.',
            }),
          })

          if (retryResponse.ok && retryResponse.body) {
            const retryReader = retryResponse.body.getReader()
            const retryDecoder = new TextDecoder()
            let retryAssistantMessage = ''

            while (true) {
              const { done, value } = await retryReader.read()
              if (done) break

              const chunk = retryDecoder.decode(value)
              const lines = chunk.split('\n')
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    if (data.content) {
                      retryAssistantMessage += data.content
                      setMessages(prev => {
                        const newMessages = [...prev]
                        if (newMessages.length > assistantMessageIndex) {
                          newMessages[assistantMessageIndex].content = retryAssistantMessage
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

            // Check retry result
            if (retryAssistantMessage.trim() === '') {
              console.warn('⚠️ Retry also returned empty response, providing fallback message')
              setMessages(prev => {
                const newMessages = [...prev]
                if (newMessages.length > assistantMessageIndex) {
                  newMessages[assistantMessageIndex].content = 'Вибачте, я не зміг згенерувати відповідь. Спробуйте ще раз.'
                }
                return newMessages
              })
            } else {
              console.log('✅ Retry successful:', { length: retryAssistantMessage.length, preview: retryAssistantMessage.substring(0, 50) + '...' })
            }
          } else {
            throw new Error('Retry request failed')
          }
        } catch (retryError) {
          console.error('❌ Retry failed:', retryError)
          setMessages(prev => {
            const newMessages = [...prev]
            if (newMessages.length > assistantMessageIndex) {
              newMessages[assistantMessageIndex].content = 'Вибачте, я не зміг згенерувати відповідь. Спробуйте ще раз.'
            }
            return newMessages
          })
        }
      } else {
        console.log('✅ Assistant response completed:', { length: assistantMessage.length, preview: assistantMessage.substring(0, 50) + '...' })
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
      
      // Save messages after AI response is complete
      if (chatId) {
        // Use setTimeout to ensure state is updated before saving
        setTimeout(() => {
          // Get current messages and save them
          setMessages(currentMessages => {
            // Save outside of setState to avoid render cycle issues
            setTimeout(() => {
              saveMessagesToChat(chatId, currentMessages)
              console.log('💾 Immediate save after AI response:', { chatId, messageCount: currentMessages.length })
            }, 0)
            return currentMessages
          })
        }, 100)
      }
      
      // Ensure scroll to bottom after message is sent
      scrollToBottom()
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
                           rehypePlugins={[rehypeRaw]}
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
                              br({ node, ...props }: any) {
                                return <br {...props} />;
                              },
                              p({ node, children, ...props }: any) {
                                return <p className="mb-2 last:mb-0" {...props}>{children}</p>;
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