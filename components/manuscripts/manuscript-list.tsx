'use client'

import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { SLATimer } from '@/components/ui/countdown-timer'
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
  ArrowRight,
  Clock,
  AlertTriangle,
  FileText
} from 'lucide-react'
import { format, isPast, differenceInHours } from 'date-fns'

export function ManuscriptList() {
  const { state, navigate, getSeriesById, getChapterById } = useApp()
  const { manuscripts, currentUser } = state

  const isEditor = currentUser.role === 'editor'
  const isMangaka = currentUser.role === 'mangaka'

  // Filter manuscripts based on role
  const visibleManuscripts = manuscripts.filter(m => {
    const chapter = getChapterById(m.chapterId)
    const series = chapter ? getSeriesById(chapter.seriesId) : null
    if (!series) return false
    
    if (isEditor) return series.editorId === currentUser.id
    if (isMangaka) return series.mangakaId === currentUser.id
    return false
  })

  // Sort by status (pending first) then by SLA deadline
  const sortedManuscripts = [...visibleManuscripts].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1
    if (b.status === 'pending' && a.status !== 'pending') return 1
    return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime()
  })

  const pendingManuscripts = sortedManuscripts.filter(m => m.status === 'pending')
  const reviewedManuscripts = sortedManuscripts.filter(m => m.status !== 'pending')

  // Count SLA breaches
  const breachedCount = pendingManuscripts.filter(m => isPast(m.slaDeadline)).length
  const urgentCount = pendingManuscripts.filter(m => {
    const hoursRemaining = differenceInHours(m.slaDeadline, new Date())
    return hoursRemaining <= 12 && hoursRemaining > 0
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Manuscripts</h1>
        <p className="text-muted-foreground">
          {isEditor ? 'Review chapter manuscripts within 48h SLA' : 'Track your manuscript submissions'}
        </p>
      </div>

      {/* SLA Alert */}
      {isEditor && (breachedCount > 0 || urgentCount > 0) && (
        <Card className={breachedCount > 0 ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/50'}>
          <CardContent className="flex items-center gap-4 p-4">
            {breachedCount > 0 ? (
              <>
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">
                    {breachedCount} SLA Breach{breachedCount !== 1 ? 'es' : ''}
                  </p>
                  <p className="text-sm text-red-700">
                    These manuscripts have exceeded the 48-hour review window.
                  </p>
                </div>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">
                    {urgentCount} Manuscript{urgentCount !== 1 ? 's' : ''} Need Urgent Review
                  </p>
                  <p className="text-sm text-amber-700">
                    Less than 12 hours remaining on SLA.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-violet-500" />
              <div>
                <p className="text-2xl font-bold">{pendingManuscripts.length}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{urgentCount}</p>
                <p className="text-xs text-muted-foreground">Urgent (less than 12h)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{breachedCount}</p>
                <p className="text-xs text-muted-foreground">SLA Breached</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Manuscripts */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Review</CardTitle>
          <CardDescription>
            Manuscripts awaiting editorial review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingManuscripts.length === 0 ? (
            <EmptyState
              icon="document"
              title="No pending manuscripts"
              description={isEditor 
                ? "All manuscripts have been reviewed. Great work!"
                : "You don't have any pending manuscript submissions."
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Series</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>SLA Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingManuscripts.map((manuscript) => {
                  const chapter = getChapterById(manuscript.chapterId)
                  const series = chapter ? getSeriesById(chapter.seriesId) : null
                  
                  return (
                    <TableRow key={manuscript.id}>
                      <TableCell className="font-medium">{series?.title}</TableCell>
                      <TableCell>
                        Ch. {chapter?.chapterNumber} - {chapter?.title}
                      </TableCell>
                      <TableCell>v{manuscript.version}</TableCell>
                      <TableCell>{format(manuscript.submittedAt, 'MMM d, h:mm a')}</TableCell>
                      <TableCell>
                        <SLATimer deadline={manuscript.slaDeadline} />
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => navigate(`manuscripts/${manuscript.id}`)}
                        >
                          {isEditor ? 'Review' : 'View'}
                          <ArrowRight className="w-3 h-3 ml-1" />
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

      {/* Reviewed Manuscripts */}
      {reviewedManuscripts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Review History</CardTitle>
            <CardDescription>
              Previously reviewed manuscripts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Series</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewedManuscripts.map((manuscript) => {
                  const chapter = getChapterById(manuscript.chapterId)
                  const series = chapter ? getSeriesById(chapter.seriesId) : null
                  
                  return (
                    <TableRow key={manuscript.id}>
                      <TableCell className="font-medium">{series?.title}</TableCell>
                      <TableCell>
                        Ch. {chapter?.chapterNumber}
                      </TableCell>
                      <TableCell>v{manuscript.version}</TableCell>
                      <TableCell>
                        <StatusBadge status={manuscript.status} />
                      </TableCell>
                      <TableCell>
                        {manuscript.reviewedAt 
                          ? format(manuscript.reviewedAt, 'MMM d, yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => navigate(`manuscripts/${manuscript.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
