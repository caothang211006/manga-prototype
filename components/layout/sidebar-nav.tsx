'use client'

import { useApp } from '@/lib/store/app-context'
import { UserRole } from '@/lib/store/types'
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
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Layers,
  FileImage,
  Trophy,
  Gavel,
  ChevronLeft,
  BookMarked,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['mangaka', 'assistant', 'editor', 'board'] },
  { id: 'proposals', label: 'Proposals', icon: FileText, roles: ['mangaka', 'editor', 'board'] },
  { id: 'series', label: 'Series', icon: BookOpen, roles: ['mangaka', 'assistant', 'editor', 'board'] },
  { id: 'tasks', label: 'Tasks', icon: Layers, roles: ['mangaka', 'assistant'] },
  { id: 'manuscripts', label: 'Manuscripts', icon: FileImage, roles: ['mangaka', 'editor'] },
  { id: 'rankings', label: 'Rankings', icon: Trophy, roles: ['editor', 'board'] },
  { id: 'decisions', label: 'Decisions', icon: Gavel, roles: ['board'] },
]

export function SidebarNav() {
  const { state, navigate } = useApp()
  const { currentUser, currentRoute } = state
  const { state: sidebarState, toggleSidebar } = useSidebar()

  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(currentUser.role)
  )

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 transition-opacity",
          sidebarState === 'collapsed' && "opacity-0"
        )}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
            <BookMarked className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground text-sm">MangaFlow</span>
            <span className="text-xs text-sidebar-foreground/60">Publishing Hub</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleSidebar}
          className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ChevronLeft className={cn(
            "w-4 h-4 transition-transform",
            sidebarState === 'collapsed' && "rotate-180"
          )} />
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const Icon = item.icon
                const isActive = currentRoute === item.id || currentRoute.startsWith(`${item.id}/`)
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => navigate(item.id)}
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                        isActive && "bg-sidebar-accent text-sidebar-foreground font-medium"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className={cn(
          "text-xs text-sidebar-foreground/50 transition-opacity",
          sidebarState === 'collapsed' && "opacity-0"
        )}>
          Press <kbd className="px-1.5 py-0.5 bg-sidebar-accent rounded text-sidebar-foreground/70">B</kbd> to toggle
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
