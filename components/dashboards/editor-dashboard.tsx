'use client'

import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { SLATimer } from '@/components/ui/countdown-timer'
import { ProgressBar } from '@/components/ui/progress-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { 
  FileImage, 
  BookOpen,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingDown
} from 'lucide-react'
import { format, isPast, differenceInHours } from 'date-fns'

export function EditorDashboard() {
  const { state, navigate, getSeriesById, getChapterById, getRankingBySeriesId } = useApp()
  const { manuscripts, series, chapters, currentUser } = state

  // Get editor's assigned series
  const mySeries = series.filter(s => s.editorId === currentUser.id)
  const activeSeries = mySeries.filter(s => s.status === 'active')
  
  // Get pending manuscripts for editor's series
  const pendingManuscripts = manuscripts.filter(m => {
    const chapter = getChapterById(m.chapterId)
    const s = chapter ? getSeriesById(chapter.seriesId) : null
    return s?.editorId === currentUser.id && m.status === 'pending'
  }).sort((a, b) => {
    // Sort by SLA deadline (most urgent first)
    return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime()
  })

  // Get manuscripts near SLA breach (less than 12 hours remaining)
  const urgentManuscripts = pendingManuscripts.filter(m => {
    const hoursRemaining = differenceInHours(m.slaDeadline, new Date())
    return hoursRemaining <= 12 && hoursRemaining > 0
  })

  // Get SLA breached manuscripts
  const breachedManuscripts = pendingManuscripts.filter(m => isPast(m.slaDeadline))

  // Get flagged series (bottom 20% in rankings)
  const flaggedSeries = activeSeries.filter(s => {
    const ranking = getRankingBySeriesId(s.id)
    return ranking?.flagged
  })

  // Series health overview
  const seriesHealth = activeSeries.map(s => {
    const ranking = getRankingBySeriesId(s.id)
    const seriesChapters = chapters.filter(c => c.seriesId === s.id)
    const inProgressChapters = seriesChapters.filter(c => c.status === 'in-progress')
    
    return {
      series: s,
      ranking,
      chaptersInProgress: inProgressChapters.length,
      avgProgress: inProgressChapters.length > 0 
        ? inProgressChapters.reduce((acc, c) => acc + c.progress, 0) / inProgressChapters.length
        : 100
    }
  })

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('manuscripts')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingManuscripts.length}</div>
            <p className="text-xs text-muted-foreground">
              {urgentManuscripts.length > 0 && (
                <span className="text-amber-600">{urgentManuscripts.length} urgent</span>
              )}
              {urgentManuscripts.length === 0 && 'Manuscripts awaiting review'}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('series')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Series</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSeries.length}</div>
            <p className="text-xs text-muted-foreground">
              Under your editorial supervision
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${breachedManuscripts.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {breachedManuscripts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {breachedManuscripts.length > 0 ? 'Needs immediate action' : 'All SLAs met'}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('rankings')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Flagged Series</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${flaggedSeries.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {flaggedSeries.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Bottom 20% in rankings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Alert */}
      {(breachedManuscripts.length > 0 || urgentManuscripts.length > 0) && (
        <Card className={breachedManuscripts.length > 0 ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50'}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${breachedManuscripts.length > 0 ? 'text-red-600' : 'text-amber-600'}`} />
              <CardTitle className={breachedManuscripts.length > 0 ? 'text-red-900' : 'text-amber-900'}>
                {breachedManuscripts.length > 0 ? 'SLA Breached - Immediate Action Required' : 'SLA Warning - Review Soon'}
              </CardTitle>
            </div>
            <CardDescription className={breachedManuscripts.length > 0 ? 'text-red-700' : 'text-amber-700'}>
              Manuscripts require review within the 48-hour SLA window
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...breachedManuscripts, ...urgentManuscripts].slice(0, 3).map((manuscript) => {
                const chapter = getChapterById(manuscript.chapterId)
                const s = chapter ? getSeriesById(chapter.seriesId) : null
                const isBreached = isPast(manuscript.slaDeadline)
                
                return (
                  <div 
                    key={manuscript.id} 
                    className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`manuscripts/${manuscript.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">{s?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Chapter {chapter?.chapterNumber} - Version {manuscript.version}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <SLATimer deadline={manuscript.slaDeadline} />
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                )
              })}
            </div>
            <Button 
              variant={breachedManuscripts.length > 0 ? 'destructive' : 'default'}
              className="mt-4 w-full" 
              onClick={() => navigate('manuscripts')}
            >
              Review All Pending Manuscripts
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Manuscripts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Manuscripts Awaiting Review</CardTitle>
              <CardDescription>Review and approve chapter manuscripts</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('manuscripts')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingManuscripts.length === 0 ? (
            <EmptyState 
              icon="document" 
              title="No pending manuscripts" 
              description="All manuscripts have been reviewed. Great work!"
            />
          ) : (
            <div className="space-y-3">
              {pendingManuscripts.slice(0, 5).map((manuscript) => {
                const chapter = getChapterById(manuscript.chapterId)
                const s = chapter ? getSeriesById(chapter.seriesId) : null
                
                return (
                  <div 
                    key={manuscript.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`manuscripts/${manuscript.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{s?.title}</h4>
                        <span className="text-xs text-muted-foreground">v{manuscript.version}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Chapter {chapter?.chapterNumber} - {chapter?.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <SLATimer deadline={manuscript.slaDeadline} />
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Series Health Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Series Health</CardTitle>
              <CardDescription>Overview of your assigned series performance</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('rankings')}>
              View Rankings
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {seriesHealth.length === 0 ? (
            <EmptyState 
              icon="inbox" 
              title="No series assigned" 
              description="You don't have any series under your supervision yet."
            />
          ) : (
            <div className="space-y-4">
              {seriesHealth
                .sort((a, b) => (a.ranking?.score || 0) - (b.ranking?.score || 0))
                .map(({ series: s, ranking, chaptersInProgress, avgProgress }) => (
                  <div 
                    key={s.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`series/${s.id}`)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{s.title}</h4>
                        {ranking?.flagged && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                            <TrendingDown className="w-3 h-3" />
                            Flagged
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{s.genre}</p>
                    </div>
                    <div className="flex items-center gap-6 ml-4">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Ranking</p>
                        <p className={`text-lg font-bold ${
                          ranking?.flagged ? 'text-red-600' : 
                          (ranking?.score || 0) >= 50 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {ranking?.score || 0}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Position</p>
                        <p className="text-lg font-bold">#{ranking?.position || '-'}</p>
                      </div>
                      <div className="w-20">
                        <p className="text-xs text-muted-foreground mb-1">Progress</p>
                        <ProgressBar value={avgProgress} variant="gradient" size="sm" showLabel={false} />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
