'use client'

import { useApp } from '@/lib/store/app-context'
import { UserRole } from '@/lib/store/types'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Bell, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const roleLabels: Record<UserRole, string> = {
  mangaka: 'Mangaka',
  assistant: 'Assistant',
  editor: 'Editor',
  board: 'Board Member',
}

const roleColors: Record<UserRole, string> = {
  mangaka: 'bg-primary text-primary-foreground',
  assistant: 'bg-blue-500 text-white',
  editor: 'bg-emerald-500 text-white',
  board: 'bg-violet-500 text-white',
}

// Helper to get display label for a user (showing dual roles if applicable)
const getUserRoleLabel = (user: { role: UserRole; isBoardMember?: boolean }) => {
  if (user.isBoardMember && user.role !== 'board') {
    return `${roleLabels[user.role]} + Board`
  }
  return roleLabels[user.role]
}

export function Header() {
  const { state, setCurrentUser, getUnreadNotificationCount, navigate, dispatch } = useApp()
  const { currentUser, users } = state
  const unreadCount = getUnreadNotificationCount()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">
          {roleLabels[currentUser.role]} Dashboard
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn("text-xs", roleColors[currentUser.role])}>
            {roleLabels[currentUser.role]}
          </Badge>
          {/* Show dual role badge if user has isBoardMember flag */}
          {currentUser.isBoardMember && currentUser.role !== 'board' && (
            <Badge variant="secondary" className={cn("text-xs", roleColors['board'])}>
              + Board Member
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => navigate('notifications')}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>

        {/* Role Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-10 px-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className={cn("text-xs", roleColors[currentUser.role])}>
                  {getInitials(currentUser.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left">
                <span className="text-sm font-medium">{currentUser.name}</span>
                <span className="text-xs text-muted-foreground">Switch role</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Switch User/Role</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {users.map((user) => (
              <DropdownMenuItem
                key={user.id}
                onClick={() => {
                  setCurrentUser(user)
                  dispatch({ type: 'SET_ROUTE', payload: 'dashboard' })
                }}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={cn("text-xs", roleColors[user.role])}>
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium">{user.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{roleLabels[user.role]}</span>
                    {user.isBoardMember && user.role !== 'board' && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-violet-100 text-violet-700 border-violet-200">
                        +Board
                      </Badge>
                    )}
                  </div>
                </div>
                {currentUser.id === user.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
