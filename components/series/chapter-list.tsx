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
  CheckCircle2
} from 'lucide-react'
import { format, isPast, differenceInDays, addDays } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Chapter } from '@/lib/store/types'

interface ChapterListProps {
  seriesId: string
}

export function ChapterList({ seriesId }: ChapterListProps) {
  const { state, dispatch, navigate, getSeriesById, getChaptersBySeriesId, getTasksByChapterId } = useApp()
  const { currentUser } = state

  const series = getSeriesById(seriesId)
  const chapters = getChaptersBySeriesId(seriesId).sort((a, b) => b.chapterNumber - a.chapterNumber)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newChapter, setNewChapter] = useState({
    title: '',
    deadline: '',
    publicationDate: '',
  })

  const isMangaka = currentUser.role === 'mangaka'
  const isCancelled = series?.status === 'cancelled'
  const canAddChapter = isMangaka && !isCancelled

  // Check if chapter is at risk
  const isChapterAtRisk = (chapter: Chapter) => {
    if (chapter.status !== 'in-progress') return false
    const now = new Date()
    const totalDays = differenceInDays(chapter.deadline, chapter.publicationDate) + 14
    const startDate = new Date(chapter.publicationDate.getTime() - totalDays * 24 * 60 * 60 * 1000)
    const daysElapsed = differenceInDays(now, startDate)
    const percentElapsed = (daysElapsed / totalDays) * 100
    return chapter.progress < 50 && percentElapsed > 70
  }

  const validateDates = () => {
    if (!newChapter.deadline || !newChapter.publicationDate) return false
    const deadline = new Date(newChapter.deadline)
    const pubDate = new Date(newChapter.publicationDate)
    // Deadline must be at least 14 days before publication
    return differenceInDays(pubDate, deadline) >= 14
  }

  const handleAddChapter = () => {
    if (!newChapter.title || !validateDates()) return

    const maxChapterNum = chapters.length > 0 
      ? Math.max(...chapters.map(c => c.chapterNumber))
      : 0

    const chapter: Chapter = {
      id: `chapter-${Date.now()}`,
      seriesId,
      chapterNumber: maxChapterNum + 1,
      title: newChapter.title,
      deadline: new Date(newChapter.deadline),
      publicationDate: new Date(newChapter.publicationDate),
      status: 'in-progress',
      progress: 0,
    }

    dispatch({ type: 'ADD_CHAPTER', payload: chapter })
    setShowAddDialog(false)
    setNewChapter({ title: '', deadline: '', publicationDate: '' })
  }

  if (!series) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('series')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Series
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Series not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('series')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{series.title}</h1>
              {isCancelled && <StatusBadge status="cancelled" />}
            </div>
            <p className="text-muted-foreground">{series.genre}</p>
          </div>
        </div>
        
        {/* BR-CHP-01: Only Mangaka can create chapters */}
        {isMangaka && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Button 
                    onClick={() => setShowAddDialog(true)}
                    disabled={!canAddChapter}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Chapter
                  </Button>
                </div>
              </TooltipTrigger>
              {!canAddChapter && isCancelled && (
                <TooltipContent>
                  Cannot add chapters to a cancelled series
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Cancelled Series Warning */}
      {isCancelled && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Series Cancelled</p>
              <p className="text-sm text-red-700">
                This series has been cancelled. No new chapters can be added.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chapters Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chapters</CardTitle>
          <CardDescription>
            {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} in this series
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chapters.length === 0 ? (
            <EmptyState
              icon="document"
              title="No chapters yet"
              description="Add your first chapter to get started."
              action={canAddChapter ? {
                label: 'Add Chapter',
                onClick: () => setShowAddDialog(true)
              } : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Ch.</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Publication</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chapters.map((chapter) => {
                  const tasks = getTasksByChapterId(chapter.id)
                  const atRisk = isChapterAtRisk(chapter)
                  const isOverdue = chapter.status === 'in-progress' && isPast(chapter.deadline)

                  return (
                    <TableRow 
                      key={chapter.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`series/${seriesId}/chapters/${chapter.id}`)}
                    >
                      <TableCell className="font-medium">
                        {chapter.chapterNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {chapter.title}
                          {atRisk && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              At Risk
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={chapter.status} />
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <ProgressBar 
                            value={chapter.progress} 
                            variant="gradient" 
                            size="sm" 
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {format(chapter.deadline, 'MMM d, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(chapter.publicationDate, 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Chapter Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Chapter</DialogTitle>
            <DialogDescription>
              Create a new chapter for {series.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Chapter Title *</Label>
              <Input
                id="title"
                value={newChapter.title}
                onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                placeholder="Enter chapter title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={newChapter.deadline}
                  onChange={(e) => setNewChapter({ ...newChapter, deadline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publication">Publication Date *</Label>
                <Input
                  id="publication"
                  type="date"
                  value={newChapter.publicationDate}
                  onChange={(e) => setNewChapter({ ...newChapter, publicationDate: e.target.value })}
                />
              </div>
            </div>
            {newChapter.deadline && newChapter.publicationDate && !validateDates() && (
              <p className="text-sm text-red-600">
                Deadline must be at least 14 days before the publication date.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Chapter number will be automatically assigned as #{chapters.length > 0 ? Math.max(...chapters.map(c => c.chapterNumber)) + 1 : 1}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddChapter}
              disabled={!newChapter.title || !validateDates()}
            >
              Add Chapter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
