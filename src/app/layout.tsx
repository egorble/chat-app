import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { AgentsProvider } from "@/contexts/agents-context"
import { ChatHistoryProvider } from "@/contexts/chat-history-context"
import { WalletProvider } from "@/providers/wallet-provider"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Le Chat - AI Assistant",
  description: "Modern AI chat interface",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProvider>
          <AgentsProvider>
            <ChatHistoryProvider>
              <SidebarProvider>
                <div className="flex h-screen w-full">
                  <AppSidebar />
                  <main className="flex-1 overflow-hidden">
                    {children}
                  </main>
                </div>
              </SidebarProvider>
            </ChatHistoryProvider>
          </AgentsProvider>
        </WalletProvider>
      </body>
    </html>
  )
}
