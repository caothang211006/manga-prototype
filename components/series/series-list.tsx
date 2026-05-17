'use client'

import { useApp } from '@/lib/store/app-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { ProgressBar } from '@/components/ui/progress-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { 
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  User,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns'

export function SeriesList() {
  const { state, navigate, getUserById, getChaptersBySeriesId, getRankingBySeriesId } = useApp()
  const { series, currentUser } = state

  const isMangaka = currentUser.role === 'mangaka'
  const isAssistant = currentUser.role === 'assistant'

  // Filter series based on role
  const visibleSeries = isMangaka || isAssistant
    ? series.filter(s => s.mangakaId === currentUser.id || series.some(sr => sr.editorId === currentUser.id))
    : series

  // Sort: active first, then by ranking score
  const sortedSeries = [...visibleSeries].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'active' ? -1 : 1
    }
    return (b.rankingScore || 0) - (a.rankingScore || 0)
  })

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'same' | undefined }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500" />
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Series</h1>
          <p className="text-muted-foreground">
            Manage your manga series and chapters
          </p>
        </div>
      </div>

      {/* Series Grid */}
      {sortedSeries.length === 0 ? (
        <EmptyState
          icon="document"
          title="No series yet"
          description="Once a proposal is approved, it will appear here as a new series."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedSeries.map((s) => {
            const editor = getUserById(s.editorId)
            const mangaka = getUserById(s.mangakaId)
            const chapters = getChaptersBySeriesId(s.id)
            const ranking = getRankingBySeriesId(s.id)
            const inProgressChapters = chapters.filter(c => c.status === 'in-progress')
            const isCancelled = s.status === 'cancelled'

            return (
              <Card 
                key={s.id} 
                className={`cursor-pointer hover:shadow-md transition-all ${
                  isCancelled ? 'opacity-60 grayscale' : ''
                }`}
                onClick={() => navigate(`series/${s.id}`)}
              >
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{s.title}</h3>
                        {isCancelled && <StatusBadge status="cancelled" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{s.genre}</p>
                    </div>
                    {ranking && (
                      <div className="flex items-center gap-1 ml-2">
                        <TrendIcon trend={ranking.trend} />
                        <span className={`text-lg font-bold ${
                          ranking.flagged ? 'text-red-600' : 
                          ranking.score >= 50 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {ranking.score}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {chapters.length} chapters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {inProgressChapters.length} in progress
                      </span>
                    </div>
                  </div>

                  {/* Progress for in-progress chapters */}
                  {inProgressChapters.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">
                        Current chapter progress
                      </p>
                      <ProgressBar 
                        value={inProgressChapters[0].progress} 
                        variant="gradient" 
                        size="sm" 
                      />
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {editor?.name || 'No editor'}
                      </span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-8">
                      View <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>

                  {/* Flagged Warning */}
                  {ranking?.flagged && (
                    <div className="mt-3 p-2 rounded bg-red-50 border border-red-100">
                      <p className="text-xs text-red-700 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        Bottom 20% - Review pending
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
