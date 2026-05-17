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
  FileText,
  CheckCircle2,
  XCircle,
  CalendarClock
} from 'lucide-react'
import { format, isPast, differenceInMinutes, addDays } from 'date-fns'

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
  
  // Separate rejected manuscripts for Mangaka (to show resubmit deadline)
  const rejectedManuscripts = reviewedManuscripts.filter(m => m.status === 'rejected')
  const approvedManuscripts = reviewedManuscripts.filter(m => m.status === 'approved')

  // Editor-only: Count SLA metrics (using minutes for testing mode)
  const breachedCount = isEditor ? pendingManuscripts.filter(m => isPast(m.slaDeadline)).length : 0
  const urgentCount = isEditor ? pendingManuscripts.filter(m => {
    const minutesRemaining = differenceInMinutes(m.slaDeadline, new Date())
    return minutesRemaining <= 12 && minutesRemaining > 0 // Less than 12 minutes remaining
  }).length : 0

  // Calculate resubmit deadline for rejected manuscripts (rejection timestamp + 3 days) BR-MAN-10
  const getResubmitDeadline = (reviewedAt: Date | undefined) => {
    if (!reviewedAt) return null
    return addDays(reviewedAt, 3)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Manuscripts</h1>
        <p className="text-muted-foreground">
          {isEditor ? 'Review chapter manuscripts within 48 minutes SLA (testing mode)' : 'Track your manuscript submissions'}
        </p>
      </div>

      {/* SLA Alert - Editor Only (Issue 6: Remove from Mangaka view) */}
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
                    These manuscripts have exceeded the 48-minute review window (testing mode).
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
                    Less than 12 minutes remaining on SLA.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats - Different for Editor vs Mangaka */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-violet-500" />
              <div>
                <p className="text-2xl font-bold">{pendingManuscripts.length}</p>
                <p className="text-xs text-muted-foreground">
                  {isMangaka ? 'Awaiting Review' : 'Pending Review'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Editor-only stats: Urgent and SLA Breached (Issue 6: Remove from Mangaka) */}
        {isEditor && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{urgentCount}</p>
                    <p className="text-xs text-muted-foreground">Urgent (less than 12 min)</p>
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
          </>
        )}
        
        {/* Mangaka-only stats: Approved and Rejected (Issue 6) */}
        {isMangaka && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{approvedManuscripts.length}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{rejectedManuscripts.length}</p>
                    <p className="text-xs text-muted-foreground">Needs Revision</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Pending Manuscripts */}
      <Card>
        <CardHeader>
          <CardTitle>{isMangaka ? 'Awaiting Review' : 'Pending Review'}</CardTitle>
          <CardDescription>
            {isMangaka 
              ? 'Manuscripts submitted, awaiting editor feedback'
              : 'Manuscripts awaiting your editorial review'
            }
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
                  {/* Issue 6: SLA Status column only for Editor */}
                  {isEditor && <TableHead>SLA Status</TableHead>}
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
                      {/* Issue 6: SLA timer only for Editor */}
                      {isEditor && (
                        <TableCell>
                          <SLATimer deadline={manuscript.slaDeadline} />
                        </TableCell>
                      )}
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

      {/* Review History */}
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
                  {/* Issue 6: Show resubmit deadline for Mangaka on rejected manuscripts */}
                  {isMangaka && <TableHead>Resubmit By</TableHead>}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewedManuscripts.map((manuscript) => {
                  const chapter = getChapterById(manuscript.chapterId)
                  const series = chapter ? getSeriesById(chapter.seriesId) : null
                  const resubmitDeadline = manuscript.status === 'rejected' 
                    ? getResubmitDeadline(manuscript.reviewedAt) 
                    : null
                  
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
                      {/* Issue 6: Resubmit deadline for rejected manuscripts (BR-MAN-10) */}
                      {isMangaka && (
                        <TableCell>
                          {resubmitDeadline && manuscript.status === 'rejected' ? (
                            <div className="flex items-center gap-1 text-sm">
                              <CalendarClock className="w-3 h-3 text-amber-500" />
                              <span className={isPast(resubmitDeadline) ? 'text-red-600' : 'text-amber-600'}>
                                {format(resubmitDeadline, 'MMM d, h:mm a')}
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      )}
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
