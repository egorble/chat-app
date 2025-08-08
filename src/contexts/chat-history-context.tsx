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
  isDeleted?: boolean
  deletedAt?: Date
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
  saveChatToIrys: (chatId: string, messages: Message[], isDeleted?: boolean) => Promise<void>
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

  const saveChatToIrys = useCallback(async (chatId: string, messages: Message[], isDeleted: boolean = false) => {
    if (!address) {
      console.warn('No wallet connected, cannot save to Irys')
      return
    }

    // Для видалених чатів дозволяємо збереження навіть без повідомлень
    if (!chatId || (!isDeleted && (!Array.isArray(messages) || messages.length === 0))) {
      console.warn('Invalid chat data for Irys save:', { chatId, messages, isDeleted })
      return
    }

    try {
      const chat = chatSessions.find(c => c.id === chatId)
      if (!chat) {
        console.warn('Chat not found for Irys save:', chatId)
        return
      }

      const logMessage = isDeleted 
        ? `🗑️ Saving deletion state to Irys: ${chatId}` 
        : `💾 Saving chat to Irys: ${chatId} (${messages.length} messages)`
      console.log(logMessage)

      const response = await fetch('/api/save-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          title: chat.title,
          messages: messages || [],
          userAddress: address,
          isDeleted,
          deletedAt: isDeleted ? new Date().toISOString() : undefined
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

  const deleteChatSession = useCallback(async (chatId: string) => {
    try {
      console.log('🗑️ Starting deletion process for chat:', chatId);
      
      // Find the chat session to delete
      const chatToDelete = chatSessions.find(chat => chat.id === chatId);
      if (!chatToDelete) {
        console.error('❌ Chat session not found:', chatId);
        return;
      }
      
      console.log('📋 Found chat to delete:', chatToDelete.title);
      
      // Immediately remove from local state for instant UI feedback
      const activeSessions = chatSessions.filter(chat => chat.id !== chatId);
      setChatSessions(activeSessions);
      console.log(`🔄 Updated local state: ${activeSessions.length} active chats remaining`);
      
      // If the deleted chat was the current chat, switch to another one
      if (currentChatId === chatId) {
        const nextChat = activeSessions.length > 0 ? activeSessions[0] : null;
        setCurrentChatId(nextChat?.id || null);
        console.log('🎯 Switched to next chat:', nextChat?.title || 'none');
      }
      
      // Save deletion state to Irys for synchronization
      if (address) {
        console.log('💾 Saving deletion state to Irys...');
        
        try {
          await saveChatToIrys(chatId, chatToDelete.messages, true); // isDeleted = true
          console.log('✅ Chat deletion successfully saved to Irys');
        } catch (irysError) {
          console.error('❌ Failed to save deletion state to Irys:', irysError);
          // Note: We don't revert the local deletion to maintain UI consistency
          // The chat will remain deleted locally even if Irys sync fails
        }
      }
      
      console.log('🎉 Chat deletion process completed for:', chatId);
      
    } catch (error) {
      console.error('❌ Error in chat deletion process:', error);
      // On error, we could optionally restore the chat to local state
      // but for now we maintain the deletion for consistency
    }
  }, [currentChatId, chatSessions, address, saveChatToIrys])

  const loadChatsFromIrys = useCallback(async () => {
    if (!address) {
      console.log('❌ No wallet address available')
      return
    }

    try {
      console.log('🔄 Loading active chats for address:', address)

      const response = await fetch(`/api/load-chats?userAddress=${encodeURIComponent(address)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to load chats: ${errorData.error}`)
      }

      const result = await response.json()
      console.log('📦 Received chats data:', {
        count: result.chats?.length || 0,
        hasChats: Array.isArray(result.chats)
      })

      if (result.chats && Array.isArray(result.chats) && result.chats.length > 0) {
        console.log('📋 Processing chats data structure:', result.chats[0]);
        
        // Convert loaded chats to ChatSession format, ensuring only active chats
        const loadedSessions: ChatSession[] = result.chats
          .filter((chatData: any) => {
            // Extra safety: ensure we only process non-deleted chats
            const isActive = !chatData.isDeleted
            if (!isActive) {
              console.log('🚫 Filtering out deleted chat:', chatData.id || chatData.chatId)
            }
            return isActive
          })
          .map((chatData: any) => {
            // Ensure messages is an array
            const messages = Array.isArray(chatData.messages) ? chatData.messages : [];
            
            const session: ChatSession = {
              id: chatData.chatId || chatData.id,
              title: chatData.title || 'Untitled Chat',
              createdAt: new Date(chatData.createdAt),
              lastMessage: messages.length > 0 ? messages[messages.length - 1].content : undefined,
              messages: messages,
              isDeleted: false, // Explicitly set to false for active chats
              deletedAt: undefined // Clear any deletion timestamp
            }
            
            console.log('✅ Processed active chat:', session.id, session.title)
            return session
          })

        console.log(`🎯 Successfully loaded ${loadedSessions.length} active chats`)
        
        // Sort by creation date (newest first) and update state
        const sortedSessions = loadedSessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        setChatSessions(sortedSessions)
        
        console.log('📋 Chat sessions state updated with active chats only')
      } else {
        console.log('📭 No active chats found, setting empty array')
        setChatSessions([])
      }

    } catch (error) {
      console.error('❌ Error loading chats:', error)
      // On error, don't clear existing sessions to avoid data loss
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