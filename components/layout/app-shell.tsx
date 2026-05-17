'use client'

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { SidebarNav } from './sidebar-nav'
import { Header } from './header'
import { AppProvider } from '@/lib/store/app-context'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <AppProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-background">
          <SidebarNav />
          <SidebarInset className="flex flex-col flex-1">
            <Header />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AppProvider>
  )
}
