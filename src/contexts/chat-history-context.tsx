"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useAccount } from 'wagmi'

interface Message {
  role: 'user' | 'assistant'
  content: string
  agent?: string
}

interface ChatSession {
  id: string
  title: string
  createdAt: Date
  lastMessage?: string
  messages: Message[]
}

interface ChatHistoryContextType {
  chatSessions: ChatSession[]
  currentChatId: string | null
  createNewChat: () => string
  selectChat: (chatId: string) => void
  updateChatTitle: (chatId: string, title: string) => void
  deleteChatSession: (chatId: string) => void
  saveMessagesToChat: (chatId: string, messages: Message[]) => void
  getChatMessages: (chatId: string) => Message[]
  saveChatToIrys: (chatId: string, messages: Message[]) => Promise<void>
  loadChatsFromIrys: () => Promise<void>
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined)

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const { address } = useAccount()

  const createNewChat = useCallback((): string => {
    const newChatId = `chat-${Date.now()}`
    const newChat: ChatSession = {
      id: newChatId,
      title: 'New Chat',
      createdAt: new Date(),
      messages: []
    }
    
    setChatSessions(prev => [newChat, ...prev])
    setCurrentChatId(newChatId)
    return newChatId
  }, [])

  const selectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId)
  }, [])

  const updateChatTitle = useCallback((chatId: string, title: string) => {
    setChatSessions(prev => 
      prev.map(chat => 
        chat.id === chatId ? { ...chat, title } : chat
      )
    )
  }, [])

  const deleteChatSession = useCallback((chatId: string) => {
    setChatSessions(prev => prev.filter(chat => chat.id !== chatId))
    if (currentChatId === chatId) {
      setCurrentChatId(null)
    }
  }, [currentChatId])

  const saveMessagesToChat = useCallback((chatId: string, messages: Message[]) => {
    // Only save if we have valid messages and chatId
    if (!chatId || !Array.isArray(messages)) {
      console.warn('Invalid save attempt:', { chatId, messages })
      return
    }
    
    setChatSessions(prev => {
      const updatedSessions = prev.map(chat => {
        if (chat.id === chatId) {
          // Create a deep copy to avoid reference issues
          return { 
            ...chat, 
            messages: [...messages],
            lastMessage: messages.length > 0 ? messages[messages.length - 1].content : undefined
          }
        }
        return chat
      })
      
      // Verify the chat exists
      const chatExists = prev.some(chat => chat.id === chatId)
      if (!chatExists) {
        console.warn('Attempting to save messages to non-existent chat:', chatId)
      }
      
      return updatedSessions
    })
  }, [])

  const getChatMessages = useCallback((chatId: string): Message[] => {
    if (!chatId) {
      return []
    }
    
    const chat = chatSessions.find(chat => chat.id === chatId)
    if (!chat) {
      console.warn('Attempting to get messages from non-existent chat:', chatId)
      return []
    }
    
    // Return a deep copy to avoid reference issues
    return chat.messages ? [...chat.messages] : []
  }, [chatSessions])

  const saveChatToIrys = useCallback(async (chatId: string, messages: Message[]) => {
    if (!address) {
      console.warn('No wallet connected, cannot save to Irys')
      return
    }

    if (!chatId || !Array.isArray(messages) || messages.length === 0) {
      console.warn('Invalid chat data for Irys save:', { chatId, messages })
      return
    }

    try {
      const chat = chatSessions.find(c => c.id === chatId)
      if (!chat) {
        console.warn('Chat not found for Irys save:', chatId)
        return
      }

      console.log('💾 Saving chat to Irys:', { chatId, title: chat.title, messageCount: messages.length })

      const response = await fetch('/api/save-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          title: chat.title,
          messages,
          userAddress: address
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to save chat: ${errorData.error}`)
      }

      const result = await response.json()
      console.log('✅ Chat saved to Irys successfully:', result)

    } catch (error) {
      console.error('❌ Error saving chat to Irys:', error)
    }
  }, [address, chatSessions])

  const loadChatsFromIrys = useCallback(async () => {
    if (!address) {
      console.warn('No wallet connected, cannot load from Irys')
      return
    }

    try {
      console.log('📥 Loading chats from Irys for address:', address)

      const response = await fetch(`/api/load-chats?userAddress=${encodeURIComponent(address)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to load chats: ${errorData.error}`)
      }

      const result = await response.json()
      console.log('📋 Loaded chats from Irys:', result)

      if (result.success && result.chats && result.chats.length > 0) {
        // Convert loaded chats to ChatSession format
        const loadedSessions: ChatSession[] = result.chats.map((chatData: any) => ({
          id: chatData.chatId,
          title: chatData.title,
          createdAt: new Date(chatData.createdAt),
          lastMessage: chatData.messages.length > 0 ? chatData.messages[chatData.messages.length - 1].content : undefined,
          messages: chatData.messages
        }))

        // Merge with existing sessions, avoiding duplicates
        setChatSessions(prev => {
          const existingIds = new Set(prev.map(chat => chat.id))
          const newSessions = loadedSessions.filter(chat => !existingIds.has(chat.id))
          return [...newSessions, ...prev].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        })

        console.log(`✅ Successfully loaded ${loadedSessions.length} chats from Irys`)
      }

    } catch (error) {
      console.error('❌ Error loading chats from Irys:', error)
    }
  }, [address])

  return (
    <ChatHistoryContext.Provider value={{
      chatSessions,
      currentChatId,
      createNewChat,
      selectChat,
      updateChatTitle,
      deleteChatSession,
      saveMessagesToChat,
      getChatMessages,
      saveChatToIrys,
      loadChatsFromIrys
    }}>
      {children}
    </ChatHistoryContext.Provider>
  )
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext)
  if (context === undefined) {
    throw new Error('useChatHistory must be used within a ChatHistoryProvider')
  }
  return context
}