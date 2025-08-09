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
  irysSaveStatus?: 'saved' | 'pending' | 'error' | 'not_saved'
  lastSavedAt?: Date
  irysId?: string
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
  clearCurrentChat: () => void
  isNewChatCreated: boolean
  markChatAsInitialized: (chatId: string) => void
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined)

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isNewChatCreated, setIsNewChatCreated] = useState<boolean>(false)
  const [initializedChats, setInitializedChats] = useState<Set<string>>(new Set())
  const { address } = useAccount()

  const createNewChat = useCallback((): string => {
    const newChatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newChat: ChatSession = {
      id: newChatId,
      title: 'New Chat',
      createdAt: new Date(),
      messages: [],
      irysSaveStatus: 'saved' as const // New empty chat is considered saved
    }
    
    console.log('🆕 Creating new chat:', newChatId)
    setChatSessions(prev => [newChat, ...prev])
    setCurrentChatId(newChatId)
    setIsNewChatCreated(true)
    
    // Clear initialized chats set to ensure proper isolation
    setInitializedChats(new Set())
    
    return newChatId
  }, [])

  const selectChat = useCallback((chatId: string) => {
    console.log('🔄 Selecting chat:', chatId, 'from current:', currentChatId)
    
    // Reset new chat flag when switching to existing chat
    setIsNewChatCreated(false)
    
    // Mark previous chat as initialized if it exists
    if (currentChatId) {
      setInitializedChats(prev => new Set([...prev, currentChatId]))
    }
    
    setCurrentChatId(chatId)
  }, [currentChatId])

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
          // Check if messages actually changed
          const messagesChanged = chat.messages.length !== messages.length || 
            JSON.stringify(chat.messages) !== JSON.stringify(messages)
          
          // Create a deep copy to avoid reference issues
          return { 
            ...chat, 
            messages: [...messages],
            lastMessage: messages.length > 0 ? messages[messages.length - 1].content : undefined,
            // Only mark as not_saved if messages actually changed
            irysSaveStatus: messagesChanged ? 'not_saved' as const : chat.irysSaveStatus
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

    // For deleted chats, allow saving even without messages
    if (!chatId || (!isDeleted && (!Array.isArray(messages) || messages.length === 0))) {
      console.warn('Invalid chat data for Irys save:', { chatId, messages, isDeleted })
      return
    }

    // Set status to pending
    setChatSessions(prev => 
      prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, irysSaveStatus: 'pending' as const }
          : chat
      )
    )

    try {
      const chat = chatSessions.find(c => c.id === chatId)
      if (!chat) {
        console.warn('Chat not found for Irys save:', chatId)
        // Set status to error if chat not found
        setChatSessions(prev => 
          prev.map(c => 
            c.id === chatId 
              ? { ...c, irysSaveStatus: 'error' as const }
              : c
          )
        )
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
      console.log('🔄 Updating irysId for chat:', chatId, 'with irysId:', result.irysId)

      // Set status to saved on success and update irysId
      setChatSessions(prev => {
        const updated = prev.map(c => 
          c.id === chatId 
            ? { 
                ...c, 
                irysSaveStatus: 'saved' as const,
                lastSavedAt: new Date(),
                irysId: result.irysId // Update with the correct Irys ID from API response
              }
            : c
        )
        console.log('📝 Updated chatSessions:', updated.find(c => c.id === chatId))
        return updated
      })

    } catch (error) {
      console.error('❌ Error saving chat to Irys:', error)
      
      // Set status to error on failure
      setChatSessions(prev => 
        prev.map(c => 
          c.id === chatId 
            ? { ...c, irysSaveStatus: 'error' as const }
            : c
        )
      )
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
              deletedAt: undefined, // Clear any deletion timestamp
              irysSaveStatus: 'saved' as const, // Loaded chats are already saved
              lastSavedAt: new Date(chatData.createdAt), // Use creation date as last saved
              irysId: chatData.irysId // Store Irys transaction ID for linking
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

  const clearCurrentChat = useCallback(() => {
    console.log('🧹 Clearing current chat')
    setCurrentChatId(null)
    setIsNewChatCreated(false)
    setInitializedChats(new Set())
  }, [])

  const markChatAsInitialized = useCallback((chatId: string) => {
    console.log('✅ Marking chat as initialized:', chatId)
    setInitializedChats(prev => new Set([...prev, chatId]))
    setIsNewChatCreated(false)
  }, [])

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
      loadChatsFromIrys,
      clearCurrentChat,
      isNewChatCreated,
      markChatAsInitialized
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