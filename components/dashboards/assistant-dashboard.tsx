'use client'

import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { 
  Layers, 
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns'

export function AssistantDashboard() {
  const { state, navigate, getSeriesById, getUserById } = useApp()
  const { tasks, chapters, currentUser } = state

  // Get assistant's assigned tasks
  const myTasks = tasks.filter(t => t.assignedTo === currentUser.id)
  
  // Group tasks by status
  const pendingTasks = myTasks.filter(t => t.status === 'pending')
  const inProgressTasks = myTasks.filter(t => t.status === 'in-progress')
  const overdueTasks = myTasks.filter(t => t.status === 'overdue')
  const submittedTasks = myTasks.filter(t => t.status === 'submitted')
  const approvedTasks = myTasks.filter(t => t.status === 'approved')

  // Tasks due soon (within 3 days)
  const tasksDueSoon = myTasks.filter(t => {
    if (['approved', 'overdue'].includes(t.status)) return false
    const daysUntilDue = differenceInDays(t.dueDate, new Date())
    return daysUntilDue >= 0 && daysUntilDue <= 3
  })

  const getTaskPriority = (task: typeof tasks[0]) => {
    if (task.status === 'overdue') return 'critical'
    if (task.status === 'rejected') return 'high'
    const daysUntilDue = differenceInDays(task.dueDate, new Date())
    if (daysUntilDue <= 1) return 'high'
    if (daysUntilDue <= 3) return 'medium'
    return 'normal'
  }

  const getDueDateLabel = (date: Date) => {
    if (isPast(date)) return 'Overdue'
    if (isToday(date)) return 'Due Today'
    if (isTomorrow(date)) return 'Due Tomorrow'
    return `Due ${format(date, 'MMM d')}`
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting start
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inProgressTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently working
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {overdueTasks.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{approvedTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Tasks Alert */}
      {(overdueTasks.length > 0 || tasksDueSoon.length > 0) && (
        <Card className={overdueTasks.length > 0 ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50'}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${overdueTasks.length > 0 ? 'text-red-600' : 'text-amber-600'}`} />
              <CardTitle className={overdueTasks.length > 0 ? 'text-red-900' : 'text-amber-900'}>
                {overdueTasks.length > 0 ? 'Urgent: Overdue Tasks' : 'Tasks Due Soon'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...overdueTasks, ...tasksDueSoon].slice(0, 4).map((task) => {
                const chapter = chapters.find(c => c.id === task.chapterId)
                const series = chapter ? getSeriesById(chapter.seriesId) : null
                const priority = getTaskPriority(task)
                
                return (
                  <div 
                    key={task.id} 
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                    onClick={() => navigate('tasks')}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        priority === 'critical' ? 'bg-red-500' :
                        priority === 'high' ? 'bg-amber-500' :
                        'bg-blue-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{series?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Ch. {chapter?.chapterNumber} - Pages {task.pageRange} ({task.taskType})
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium ${
                        isPast(task.dueDate) ? 'text-red-600' :
                        isToday(task.dueDate) ? 'text-amber-600' :
                        'text-muted-foreground'
                      }`}>
                        {getDueDateLabel(task.dueDate)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>My Assigned Tasks</CardTitle>
              <CardDescription>All tasks assigned to you</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('tasks')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myTasks.length === 0 ? (
            <EmptyState 
              icon="inbox" 
              title="No tasks assigned" 
              description="You don't have any tasks assigned yet. Check back later."
            />
          ) : (
            <div className="space-y-3">
              {myTasks
                .filter(t => !['approved'].includes(t.status))
                .sort((a, b) => {
                  // Sort by priority: overdue first, then by due date
                  if (a.status === 'overdue' && b.status !== 'overdue') return -1
                  if (b.status === 'overdue' && a.status !== 'overdue') return 1
                  return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
                })
                .slice(0, 5)
                .map((task) => {
                  const chapter = chapters.find(c => c.id === task.chapterId)
                  const series = chapter ? getSeriesById(chapter.seriesId) : null
                  
                  return (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => navigate('tasks')}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{series?.title}</h4>
                          <StatusBadge status={task.status} />
                          {task.rejectionCount >= 2 && (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                              {task.rejectionCount}/3 rejections
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Chapter {chapter?.chapterNumber} - Pages {task.pageRange} - {task.taskType}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-sm font-medium ${
                          isPast(task.dueDate) ? 'text-red-600' :
                          differenceInDays(task.dueDate, new Date()) <= 1 ? 'text-amber-600' :
                          'text-foreground'
                        }`}>
                          {getDueDateLabel(task.dueDate)}
                        </p>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submitted Tasks Awaiting Review */}
      {submittedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Awaiting Review</CardTitle>
            <CardDescription>Tasks you&apos;ve submitted, waiting for mangaka approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submittedTasks.map((task) => {
                const chapter = chapters.find(c => c.id === task.chapterId)
                const series = chapter ? getSeriesById(chapter.seriesId) : null
                
                return (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-violet-50 border border-violet-100">
                    <div>
                      <p className="font-medium text-sm">{series?.title} - Ch. {chapter?.chapterNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Pages {task.pageRange} ({task.taskType})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status="submitted" />
                      {task.submittedAt && (
                        <span className="text-xs text-muted-foreground">
                          {format(task.submittedAt, 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
