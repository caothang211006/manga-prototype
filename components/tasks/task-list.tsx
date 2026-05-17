'use client'

import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send
} from 'lucide-react'
import { format, isPast, differenceInDays } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'
import { Task } from '@/lib/store/types'

export function TaskList() {
  const { state, dispatch, getSeriesById, getChapterById, getUserById } = useApp()
  const { tasks, chapters, currentUser } = state

  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const isAssistant = currentUser.role === 'assistant'
  const isMangaka = currentUser.role === 'mangaka'

  // Filter tasks based on role
  const myTasks = isAssistant
    ? tasks.filter(t => t.assignedTo === currentUser.id)
    : tasks.filter(t => {
        const chapter = getChapterById(t.chapterId)
        const series = chapter ? getSeriesById(chapter.seriesId) : null
        return series?.mangakaId === currentUser.id
      })

  // Group tasks by status
  const pendingTasks = myTasks.filter(t => t.status === 'pending')
  const inProgressTasks = myTasks.filter(t => t.status === 'in-progress')
  const submittedTasks = myTasks.filter(t => t.status === 'submitted')
  const overdueTasks = myTasks.filter(t => t.status === 'overdue')
  const approvedTasks = myTasks.filter(t => t.status === 'approved')
  const rejectedTasks = myTasks.filter(t => t.status === 'rejected')

  const handleStartTask = (task: Task) => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: { ...task, status: 'in-progress' }
    })
  }

  const handleSubmitTask = () => {
    if (!selectedTask) return
    dispatch({
      type: 'UPDATE_TASK',
      payload: { ...selectedTask, status: 'submitted', submittedAt: new Date() }
    })
    setShowSubmitDialog(false)
    setSelectedTask(null)
  }

  const handleApproveTask = (task: Task) => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: { ...task, status: 'approved' }
    })
  }

  const handleRejectTask = (task: Task) => {
    const newRejectionCount = task.rejectionCount + 1
    dispatch({
      type: 'UPDATE_TASK',
      payload: { 
        ...task, 
        status: newRejectionCount >= 3 ? 'delayed' : 'rejected',
        rejectionCount: newRejectionCount
      }
    })
  }

  const renderTaskRow = (task: Task) => {
    const chapter = getChapterById(task.chapterId)
    const series = chapter ? getSeriesById(chapter.seriesId) : null
    const assignee = getUserById(task.assignedTo)
    const isOverdue = isPast(task.dueDate) && !['approved', 'submitted'].includes(task.status)

    return (
      <TableRow key={task.id}>
        <TableCell>
          <div>
            <p className="font-medium">{series?.title}</p>
            <p className="text-xs text-muted-foreground">Ch. {chapter?.chapterNumber}</p>
          </div>
        </TableCell>
        <TableCell className="font-medium">{task.pageRange}</TableCell>
        <TableCell className="capitalize">{task.taskType}</TableCell>
        <TableCell>
          {!isAssistant && assignee?.name}
          {isAssistant && '-'}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            {task.rejectionCount > 0 && task.status !== 'approved' && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                {task.rejectionCount}/3
              </span>
            )}
            {task.rejectionCount >= 3 && (
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                Escalated
              </span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
            {format(task.dueDate, 'MMM d, yyyy')}
          </span>
        </TableCell>
        <TableCell>
          {isAssistant && task.status === 'pending' && (
            <Button size="sm" variant="outline" onClick={() => handleStartTask(task)}>
              Start
            </Button>
          )}
          {isAssistant && task.status === 'in-progress' && (
            <Button 
              size="sm" 
              onClick={() => {
                setSelectedTask(task)
                setShowSubmitDialog(true)
              }}
            >
              <Send className="w-3 h-3 mr-1" />
              Submit
            </Button>
          )}
          {isAssistant && task.status === 'rejected' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleStartTask(task)}
              disabled={task.rejectionCount >= 3}
            >
              Revise
            </Button>
          )}
          {isMangaka && task.status === 'submitted' && (
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline"
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                onClick={() => handleApproveTask(task)}
              >
                Approve
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleRejectTask(task)}
                disabled={task.rejectionCount >= 3}
              >
                Reject
              </Button>
            </div>
          )}
          {task.status === 'approved' && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Complete
            </span>
          )}
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-muted-foreground">
          {isAssistant ? 'Your assigned page tasks' : 'Manage page tasks for your series'}
        </p>
      </div>

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <p className="font-medium text-red-900">
                {overdueTasks.length} Overdue Task{overdueTasks.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-700">
                These tasks have passed their due date and need immediate attention.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{pendingTasks.length + inProgressTasks.length}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-violet-500" />
              <div>
                <p className="text-2xl font-bold">{submittedTasks.length}</p>
                <p className="text-xs text-muted-foreground">Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{approvedTasks.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks Table with Tabs */}
      <Card>
        <Tabs defaultValue="active" className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Tasks</CardTitle>
              <TabsList>
                <TabsTrigger value="active">
                  Active ({pendingTasks.length + inProgressTasks.length})
                </TabsTrigger>
                <TabsTrigger value="submitted">
                  Submitted ({submittedTasks.length})
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Completed ({approvedTasks.length})
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="active" className="mt-0">
              {pendingTasks.length === 0 && inProgressTasks.length === 0 ? (
                <EmptyState
                  icon="inbox"
                  title="No active tasks"
                  description="You don't have any pending or in-progress tasks."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Series</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...overdueTasks, ...inProgressTasks, ...pendingTasks, ...rejectedTasks].map(renderTaskRow)}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="submitted" className="mt-0">
              {submittedTasks.length === 0 ? (
                <EmptyState
                  icon="inbox"
                  title="No submitted tasks"
                  description="No tasks are currently awaiting review."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Series</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submittedTasks.map(renderTaskRow)}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-0">
              {approvedTasks.length === 0 ? (
                <EmptyState
                  icon="inbox"
                  title="No completed tasks"
                  description="Completed tasks will appear here."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Series</TableHead>
                      <TableHead>Pages</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedTasks.map(renderTaskRow)}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Submit Task Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Task for Review</DialogTitle>
            <DialogDescription>
              Your work will be submitted to the mangaka for approval.
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="py-4">
              <div className="p-4 rounded-lg bg-muted">
                <p className="font-medium">Pages {selectedTask.pageRange}</p>
                <p className="text-sm text-muted-foreground capitalize">{selectedTask.taskType}</p>
              </div>
              {selectedTask.rejectionCount > 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  Note: This task has been rejected {selectedTask.rejectionCount} time{selectedTask.rejectionCount !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitTask}>
              Submit for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
