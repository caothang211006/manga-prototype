'use client'

import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { CountdownTimer } from '@/components/ui/countdown-timer'
import { EmptyState } from '@/components/ui/empty-state'
import { 
  FileText, 
  BookOpen, 
  Layers, 
  FileImage, 
  ArrowRight, 
  AlertTriangle,
  Clock,
  CheckCircle2
} from 'lucide-react'
import { format, isPast, differenceInDays } from 'date-fns'

export function MangakaDashboard() {
  const { state, navigate, getSeriesById, getChaptersBySeriesId, getTasksByChapterId } = useApp()
  const { proposals, series, chapters, tasks, manuscripts, currentUser } = state

  // Get mangaka's data
  const myProposals = proposals.filter(p => p.mangakaId === currentUser.id)
  const mySeries = series.filter(s => s.mangakaId === currentUser.id && s.status === 'active')
  const activeProposal = myProposals.find(p => ['draft', 'submitted', 'voting'].includes(p.status))
  
  // Get chapters in progress
  const chaptersInProgress = chapters.filter(ch => {
    const s = getSeriesById(ch.seriesId)
    return s?.mangakaId === currentUser.id && ch.status === 'in-progress'
  })

  // Get overdue tasks
  const overdueTasks = tasks.filter(t => {
    const chapter = chapters.find(c => c.id === t.chapterId)
    const s = chapter ? getSeriesById(chapter.seriesId) : null
    return s?.mangakaId === currentUser.id && t.status === 'overdue'
  })

  // Get pending manuscripts
  const pendingManuscripts = manuscripts.filter(m => m.status === 'pending')

  // Check if chapter is at risk
  const isChapterAtRisk = (chapter: typeof chapters[0]) => {
    const now = new Date()
    const totalDays = differenceInDays(chapter.deadline, chapter.publicationDate) + 14
    const daysElapsed = differenceInDays(now, new Date(chapter.deadline.getTime() - totalDays * 24 * 60 * 60 * 1000))
    const percentElapsed = (daysElapsed / totalDays) * 100
    return chapter.progress < 50 && percentElapsed > 70
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('proposals')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Proposals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myProposals.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeProposal ? '1 active proposal' : 'No active proposal'}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('series')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Series</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mySeries.length}</div>
            <p className="text-xs text-muted-foreground">
              {chaptersInProgress.length} chapters in progress
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('tasks')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueTasks.length > 0 ? 'text-red-600' : ''}`}>
              {overdueTasks.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Needs immediate attention
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('manuscripts')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Manuscripts</CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingManuscripts.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting editor review
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Proposal Status */}
      {activeProposal && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Proposal</CardTitle>
                <CardDescription>Current status of your proposal submission</CardDescription>
              </div>
              <StatusBadge status={activeProposal.status} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{activeProposal.title}</h3>
                <p className="text-sm text-muted-foreground">{activeProposal.genre}</p>
              </div>
              {activeProposal.status === 'voting' && activeProposal.votingDeadline && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Voting ends in</p>
                  <CountdownTimer deadline={activeProposal.votingDeadline} variant="compact" />
                </div>
              )}
            </div>
            {activeProposal.status === 'voting' && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Votes collected</span>
                  <span className="font-medium">{activeProposal.votes.length}/3 required</span>
                </div>
                <ProgressBar value={activeProposal.votes.length} max={3} variant="gradient" />
              </div>
            )}
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => navigate(`proposals/${activeProposal.id}`)}
            >
              View Details <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Chapters in Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chapters in Progress</CardTitle>
              <CardDescription>Track your ongoing chapter work</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('series')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {chaptersInProgress.length === 0 ? (
            <EmptyState 
              icon="calendar" 
              title="No chapters in progress" 
              description="All your chapters are either complete or awaiting publication."
            />
          ) : (
            <div className="space-y-4">
              {chaptersInProgress.map((chapter) => {
                const s = getSeriesById(chapter.seriesId)
                const atRisk = isChapterAtRisk(chapter)
                
                return (
                  <div 
                    key={chapter.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`series/${chapter.seriesId}/chapters/${chapter.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{s?.title} - Ch. {chapter.chapterNumber}</h4>
                        {atRisk && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            At Risk
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{chapter.title}</p>
                    </div>
                    <div className="flex items-center gap-6 ml-4">
                      <div className="w-32">
                        <ProgressBar value={chapter.progress} variant="gradient" size="sm" />
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-xs text-muted-foreground">Due</p>
                        <p className={`text-sm font-medium ${isPast(chapter.deadline) ? 'text-red-600' : ''}`}>
                          {format(chapter.deadline, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overdue Tasks Alert */}
      {overdueTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <CardTitle className="text-red-900">Overdue Tasks</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              These tasks need immediate attention from your assistants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueTasks.slice(0, 3).map((task) => {
                const chapter = chapters.find(c => c.id === task.chapterId)
                const s = chapter ? getSeriesById(chapter.seriesId) : null
                
                return (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-100">
                    <div>
                      <p className="font-medium text-sm">{s?.title} - Ch. {chapter?.chapterNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        Pages {task.pageRange} - {task.taskType}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status="overdue" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Due: {format(task.dueDate, 'MMM d')}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <Button 
              variant="destructive" 
              className="mt-4 w-full" 
              onClick={() => navigate('tasks')}
            >
              View All Overdue Tasks
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
