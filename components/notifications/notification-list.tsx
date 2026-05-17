'use client'

import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Vote,
  Clock,
  X,
  CheckCheck,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDistanceToNow } from 'date-fns'
import type { Notification } from '@/lib/store/types'

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'task_assigned':
      return <FileText className="h-4 w-4 text-blue-500" />
    case 'task_rejected':
      return <AlertTriangle className="h-4 w-4 text-destructive" />
    case 'manuscript_submitted':
      return <FileText className="h-4 w-4 text-green-500" />
    case 'manuscript_approved':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'manuscript_rejected':
      return <X className="h-4 w-4 text-destructive" />
    case 'decision_opened':
      return <Vote className="h-4 w-4 text-blue-500" />
    case 'decision_closed':
      return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
    case 'deadline_approaching':
      return <Clock className="h-4 w-4 text-yellow-500" />
    case 'proposal_status_changed':
      return <Bell className="h-4 w-4 text-blue-500" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

function getNotificationBadge(type: Notification['type']) {
  switch (type) {
    case 'task_assigned':
      return <Badge variant="secondary">Task</Badge>
    case 'task_rejected':
      return <Badge variant="destructive">Rejected</Badge>
    case 'manuscript_submitted':
      return <Badge variant="outline">Manuscript</Badge>
    case 'manuscript_approved':
      return <Badge variant="default" className="bg-green-500">Approved</Badge>
    case 'manuscript_rejected':
      return <Badge variant="destructive">Rejected</Badge>
    case 'decision_opened':
      return <Badge variant="default">Decision</Badge>
    case 'decision_closed':
      return <Badge variant="secondary">Closed</Badge>
    case 'deadline_approaching':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Deadline</Badge>
    case 'proposal_status_changed':
      return <Badge variant="outline">Proposal</Badge>
    default:
      return <Badge variant="secondary">System</Badge>
  }
}

export function NotificationList() {
  const { state, dispatch } = useApp()
  
  const userNotifications = state.notifications.filter(
    n => n.userId === state.currentUser.id
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  const unreadCount = userNotifications.filter(n => !n.read).length
  
  const handleMarkAsRead = (notificationId: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notificationId })
  }
  
  const handleMarkAllAsRead = () => {
    userNotifications.forEach(n => {
      if (!n.read) {
        dispatch({ type: 'MARK_NOTIFICATION_READ', payload: n.id })
      }
    })
  }
  
  const handleNotificationClick = (notification: Notification) => {
    handleMarkAsRead(notification.id)
    
    if (notification.link) {
      const [view, id] = notification.link.split('/')
      if (view && id) {
        dispatch({ 
          type: 'NAVIGATE', 
          payload: { view: view as any, params: { id } } 
        })
      } else if (view) {
        dispatch({ type: 'NAVIGATE', payload: { view: view as any } })
      }
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated on tasks, manuscripts, and decisions
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        )}
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Notifications</CardDescription>
            <CardTitle className="text-3xl">{userNotifications.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        
        <Card className={unreadCount > 0 ? 'border-primary' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Unread</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {unreadCount}
              {unreadCount > 0 && <Bell className="h-5 w-5 text-primary animate-pulse" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Read</CardDescription>
            <CardTitle className="text-3xl">{userNotifications.length - unreadCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Already viewed</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            All Notifications
          </CardTitle>
          <CardDescription>
            Click on a notification to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="You're all caught up! New notifications will appear here."
            />
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {userNotifications.map((notification, index) => (
                  <div key={notification.id}>
                    <div
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors
                        ${notification.read 
                          ? 'hover:bg-muted/50' 
                          : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
                        }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getNotificationBadge(notification.type)}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                          </span>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'font-medium'}`}>
                          {notification.message}
                        </p>
                        {notification.link && (
                          <p className="text-xs text-primary mt-1">Click to view</p>
                        )}
                      </div>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {index < userNotifications.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
