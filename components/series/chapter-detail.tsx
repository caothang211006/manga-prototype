'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { ProgressBar } from '@/components/ui/progress-bar'
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
  ArrowLeft,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Send,
  User
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Task, TaskType } from '@/lib/store/types'

interface ChapterDetailProps {
  chapterId: string
}

export function ChapterDetail({ chapterId }: ChapterDetailProps) {
  const { state, dispatch, navigate, getChapterById, getSeriesById, getTasksByChapterId, getUserById } = useApp()
  const { currentUser, users } = state

  const chapter = getChapterById(chapterId)
  const series = chapter ? getSeriesById(chapter.seriesId) : null
  const tasks = getTasksByChapterId(chapterId)

  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [newTask, setNewTask] = useState({
    pageRange: '',
    taskType: '' as TaskType | '',
    assignedTo: '',
    dueDate: '',
  })

  const isMangaka = currentUser.role === 'mangaka'
  const assistants = users.filter(u => u.role === 'assistant')

  // Calculate progress based on tasks
  const completedTasks = tasks.filter(t => t.status === 'approved').length
  const totalTasks = tasks.length
  const calculatedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // BR-53: Check if there's an active review cycle (pending manuscript) for this chapter
  const activeReviewCycle = state.manuscripts.some(
    m => m.chapterId === chapterId && m.status === 'pending'
  )

  const canAddTask = isMangaka && chapter?.status === 'in-progress'
  
  // BR-25: Cannot submit if progress < 100%
  // BR-53: Cannot submit if active review cycle exists
  const canSubmitForReview = isMangaka && chapter?.status === 'in-progress' && calculatedProgress === 100 && !activeReviewCycle
  
  // BR-25 & BR-53: Tooltip reasons for disabled submit
  const getSubmitBlockedReason = () => {
    if (calculatedProgress < 100) {
      return `Cannot submit - chapter is only ${calculatedProgress}% complete. All page tasks must be Approved first (BR-25).`
    }
    if (activeReviewCycle) {
      return 'Cannot submit - an active review cycle exists for this chapter (BR-53).'
    }
    return null
  }
  const submitBlockedReason = getSubmitBlockedReason()

  // Check for page range overlap
  const checkPageOverlap = (newRange: string) => {
    const [newStart, newEnd] = newRange.split('-').map(Number)
    if (isNaN(newStart) || isNaN(newEnd)) return false
    
    return tasks.some(task => {
      const [start, end] = task.pageRange.split('-').map(Number)
      return (newStart <= end && newEnd >= start)
    })
  }

  const validateTask = () => {
    if (!newTask.pageRange || !newTask.taskType || !newTask.assignedTo || !newTask.dueDate) {
      return false
    }
    
    // Check page range format
    const rangeMatch = newTask.pageRange.match(/^(\d+)-(\d+)$/)
    if (!rangeMatch) return false
    
    // Check for overlap
    if (checkPageOverlap(newTask.pageRange)) return false
    
    // Check due date is before chapter deadline
    if (chapter && new Date(newTask.dueDate) > chapter.deadline) return false
    
    // Cannot assign to self
    if (newTask.assignedTo === currentUser.id) return false
    
    return true
  }

  const handleAddTask = () => {
    if (!validateTask() || !chapter) return

    const task: Task = {
      id: `task-${Date.now()}`,
      chapterId: chapter.id,
      pageRange: newTask.pageRange,
      taskType: newTask.taskType as TaskType,
      assignedTo: newTask.assignedTo,
      dueDate: new Date(newTask.dueDate),
      status: 'pending',
      rejectionCount: 0,
    }

    dispatch({ type: 'ADD_TASK', payload: task })
    setShowAddTaskDialog(false)
    setNewTask({ pageRange: '', taskType: '', assignedTo: '', dueDate: '' })
  }

  const handleSubmitForReview = () => {
    if (!chapter) return

    dispatch({
      type: 'UPDATE_CHAPTER',
      payload: { ...chapter, status: 'complete', progress: 100 }
    })
    setShowSubmitDialog(false)
  }

  const handleTaskAction = (task: Task, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { ...task, status: 'approved' }
      })
    } else {
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
  }

  if (!chapter || !series) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('series')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Series
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Chapter not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isAtRisk = (() => {
    if (chapter.status !== 'in-progress') return false
    const now = new Date()
    const totalDays = differenceInDays(chapter.deadline, chapter.publicationDate) + 14
    const startDate = new Date(chapter.publicationDate.getTime() - totalDays * 24 * 60 * 60 * 1000)
    const daysElapsed = differenceInDays(now, startDate)
    const percentElapsed = (daysElapsed / totalDays) * 100
    return calculatedProgress < 50 && percentElapsed > 70
  })()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`series/${series.id}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">{series.title}</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                Chapter {chapter.chapterNumber}: {chapter.title}
              </h1>
              <StatusBadge status={chapter.status} />
              {isAtRisk && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  At Risk
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canAddTask && (
            <Button variant="outline" onClick={() => setShowAddTaskDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          )}
          {/* BR-25 & BR-53: Submit button only for Mangaka with tooltip showing reason for disabled state */}
          {isMangaka && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button 
                      onClick={() => setShowSubmitDialog(true)}
                      disabled={!canSubmitForReview}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit Manuscript
                    </Button>
                  </div>
                </TooltipTrigger>
                {submitBlockedReason && (
                  <TooltipContent className="max-w-xs">
                    {submitBlockedReason}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Overall Progress</span>
              <span className="text-lg font-bold">{calculatedProgress}%</span>
            </div>
            <ProgressBar value={calculatedProgress} variant="gradient" showLabel={false} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className={`text-lg font-semibold ${isPast(chapter.deadline) ? 'text-red-600' : ''}`}>
                  {format(chapter.deadline, 'MMM d, yyyy')}
                </p>
              </div>
              <Calendar className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Publication</p>
                <p className="text-lg font-semibold">
                  {format(chapter.publicationDate, 'MMM d, yyyy')}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At Risk Warning */}
      {isAtRisk && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">Chapter At Risk</p>
              <p className="text-sm text-amber-700">
                Progress is below 50% with more than 70% of the deadline elapsed. Consider reassigning tasks or adjusting the schedule.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} - {completedTasks} approved
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="No tasks yet"
              description="Break down the chapter work into tasks and assign them to assistants."
              action={canAddTask ? {
                label: 'Add Task',
                onClick: () => setShowAddTaskDialog(true)
              } : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pages</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  {isMangaka && <TableHead className="w-[150px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const assignee = getUserById(task.assignedTo)
                  const canApprove = isMangaka && task.status === 'submitted'
                  
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.pageRange}</TableCell>
                      <TableCell className="capitalize">{task.taskType}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {assignee?.name || 'Unassigned'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={task.status} />
                          {task.rejectionCount >= 2 && task.status !== 'approved' && (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                              {task.rejectionCount}/3 rejections
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
                        <span className={isPast(task.dueDate) && task.status !== 'approved' ? 'text-red-600' : ''}>
                          {format(task.dueDate, 'MMM d')}
                        </span>
                      </TableCell>
                      {isMangaka && (
                        <TableCell>
                          {canApprove && (
                            <div className="flex items-center gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleTaskAction(task, 'approve')}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleTaskAction(task, 'reject')}
                                disabled={task.rejectionCount >= 3}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {task.status === 'approved' && (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Locked
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Task Dialog */}
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Assign a page range to an assistant
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pageRange">Page Range *</Label>
              <Input
                id="pageRange"
                value={newTask.pageRange}
                onChange={(e) => setNewTask({ ...newTask, pageRange: e.target.value })}
                placeholder="e.g., 1-5"
              />
              {newTask.pageRange && checkPageOverlap(newTask.pageRange) && (
                <p className="text-sm text-red-600">
                  This page range overlaps with an existing task.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Task Type *</Label>
              <Select
                value={newTask.taskType}
                onValueChange={(value) => setNewTask({ ...newTask, taskType: value as TaskType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sketch">Sketch</SelectItem>
                  <SelectItem value="inking">Inking</SelectItem>
                  <SelectItem value="screentone">Screentone</SelectItem>
                  <SelectItem value="background">Background</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign To *</Label>
              <Select
                value={newTask.assignedTo}
                onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assistant" />
                </SelectTrigger>
                <SelectContent>
                  {assistants.map((assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id}>
                      {assistant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newTask.assignedTo === currentUser.id && (
                <p className="text-sm text-red-600">
                  You cannot assign tasks to yourself.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input
                id="dueDate"
                type="date"
                value={newTask.dueDate}
                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
              />
              {newTask.dueDate && chapter && new Date(newTask.dueDate) > chapter.deadline && (
                <p className="text-sm text-red-600">
                  Due date must be before chapter deadline ({format(chapter.deadline, 'MMM d')}).
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTaskDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={!validateTask()}>
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit for Review Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Chapter for Review?</DialogTitle>
            <DialogDescription>
              All tasks are approved. This chapter is ready for editorial review.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-900">Ready for Review</p>
                <p className="text-sm text-emerald-700">
                  {tasks.length} tasks completed and approved.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitForReview}>
              Submit for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
