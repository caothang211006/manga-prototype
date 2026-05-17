'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/status-badge'
import { SLATimer } from '@/components/ui/countdown-timer'
import { 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  MessageSquare,
  History,
  AlertTriangle,
  CalendarClock
} from 'lucide-react'
import { format, isPast, addDays } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import type { Annotation } from '@/lib/store/types'

interface ManuscriptReviewProps {
  manuscriptId: string
}

export function ManuscriptReview({ manuscriptId }: ManuscriptReviewProps) {
  const { state, dispatch, navigate, getChapterById, getSeriesById, getManuscriptsByChapterId } = useApp()
  const { manuscripts, currentUser } = state

  const manuscript = manuscripts.find(m => m.id === manuscriptId)
  const chapter = manuscript ? getChapterById(manuscript.chapterId) : null
  const series = chapter ? getSeriesById(chapter.seriesId) : null
  const allVersions = chapter ? getManuscriptsByChapterId(chapter.id).sort((a, b) => b.version - a.version) : []

  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [feedback, setFeedback] = useState('')
  
  // Issue 8: Always-visible inline annotation form state
  const [annotationPageNumber, setAnnotationPageNumber] = useState('')
  const [annotationComment, setAnnotationComment] = useState('')
  const [annotationError, setAnnotationError] = useState<string | null>(null)

  const isEditor = currentUser.role === 'editor'
  const isMangaka = currentUser.role === 'mangaka'
  const canReview = isEditor && manuscript?.status === 'pending'

  // BR-MAN-10: Resubmit deadline for rejected manuscripts (rejection timestamp + 3 days)
  const resubmitDeadline = manuscript?.status === 'rejected' && manuscript?.reviewedAt 
    ? addDays(manuscript.reviewedAt, 3)
    : null

  const handleApprove = () => {
    if (!manuscript) return
    
    dispatch({
      type: 'UPDATE_MANUSCRIPT',
      payload: {
        ...manuscript,
        status: 'approved',
        feedback: feedback || undefined,
        reviewedAt: new Date()
      }
    })
    setShowApproveDialog(false)
    setFeedback('')
  }

  const handleReject = () => {
    if (!manuscript) return
    
    dispatch({
      type: 'UPDATE_MANUSCRIPT',
      payload: {
        ...manuscript,
        status: 'rejected',
        feedback: feedback,
        reviewedAt: new Date()
      }
    })
    setShowRejectDialog(false)
    setFeedback('')
  }

  // Issue 7 & 8: Handle adding annotation with page number validation
  const handleAddAnnotation = () => {
    setAnnotationError(null)
    
    // BR-MAN-07: Page number is required
    if (!annotationPageNumber.trim()) {
      setAnnotationError('Page number is required (BR-MAN-07)')
      return
    }
    
    const pageNum = parseInt(annotationPageNumber, 10)
    
    // Validate page number is a positive integer
    if (isNaN(pageNum) || pageNum <= 0) {
      setAnnotationError('Page number must be a positive integer (BR-MAN-07)')
      return
    }
    
    // Validate comment is not empty
    if (!annotationComment.trim()) {
      setAnnotationError('Comment is required')
      return
    }
    
    if (!manuscript) return
    
    const newAnnotation: Annotation = {
      id: `anno-${Date.now()}`,
      pageNumber: pageNum,
      x: 0,
      y: 0,
      comment: annotationComment.trim(),
      createdAt: new Date()
    }
    
    dispatch({
      type: 'UPDATE_MANUSCRIPT',
      payload: {
        ...manuscript,
        annotations: [...manuscript.annotations, newAnnotation]
      }
    })
    
    // Reset form
    setAnnotationPageNumber('')
    setAnnotationComment('')
  }

  if (!manuscript || !chapter || !series) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('manuscripts')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Manuscripts
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Manuscript not found</p>
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
          <Button variant="ghost" size="icon" onClick={() => navigate('manuscripts')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">{series.title}</p>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                Chapter {chapter.chapterNumber} - Version {manuscript.version}
              </h1>
              <StatusBadge status={manuscript.status} />
            </div>
          </div>
        </div>
        
        {/* Issue 7: SLA timer only for Editor on pending manuscripts */}
        {isEditor && manuscript.status === 'pending' && (
          <SLATimer deadline={manuscript.slaDeadline} />
        )}
      </div>

      {/* Status Banners */}
      {manuscript.status === 'approved' && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-center gap-4 p-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Manuscript Approved</p>
              <p className="text-sm text-emerald-700">
                Approved on {manuscript.reviewedAt ? format(manuscript.reviewedAt, 'MMMM d, yyyy') : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {manuscript.status === 'rejected' && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex items-center gap-4 p-4">
            <XCircle className="w-6 h-6 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Manuscript Rejected</p>
              <p className="text-sm text-red-700">
                {isMangaka 
                  ? 'Please address the feedback and resubmit.'
                  : 'The mangaka has 3 days to address your feedback and resubmit.'
                }
              </p>
              {/* Issue 6: Show resubmit deadline for Mangaka (BR-MAN-10) */}
              {isMangaka && resubmitDeadline && (
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <CalendarClock className="w-4 h-4 text-red-600" />
                  <span className={isPast(resubmitDeadline) ? 'text-red-700 font-medium' : 'text-red-600'}>
                    Resubmit by: {format(resubmitDeadline, 'MMM d, yyyy h:mm a')}
                    {isPast(resubmitDeadline) && ' (Overdue)'}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Manuscript Preview - Issue 8: Show 3 pages */}
          <Card>
            <CardHeader>
              <CardTitle>Manuscript Preview</CardTitle>
              <CardDescription>
                Review the submitted chapter pages (3 pages)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((pageNum) => (
                  <div 
                    key={pageNum}
                    className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center border-2 border-dashed"
                  >
                    <div className="text-center p-2">
                      <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Page {pageNum}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  {manuscript.fileUrl}
                </p>
                <Button variant="outline" size="sm">
                  Open Full Viewer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Section - Show for Mangaka if rejected */}
          {manuscript.feedback && (
            <Card className={manuscript.status === 'rejected' ? 'border-amber-200' : ''}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <CardTitle>Editor Feedback</CardTitle>
                </div>
                {isMangaka && manuscript.status === 'rejected' && (
                  <CardDescription className="text-amber-600">
                    Please address these issues before resubmitting
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{manuscript.feedback}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons for Editor */}
          {canReview && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Review Decision</h3>
                    <p className="text-sm text-muted-foreground">
                      Approve to publish or reject with feedback
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setShowRejectDialog(true)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setShowApproveDialog(true)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Manuscript Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={manuscript.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">{manuscript.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>{format(manuscript.submittedAt, 'MMM d, h:mm a')}</span>
                </div>
                {manuscript.reviewedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reviewed</span>
                    <span>{format(manuscript.reviewedAt, 'MMM d, h:mm a')}</span>
                  </div>
                )}
              </div>

              {/* Issue 7: SLA info only for Editor on pending manuscripts */}
              {isEditor && manuscript.status === 'pending' && (
                <>
                  <Separator />
                  <div className="p-3 rounded-lg bg-muted space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Review SLA</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Testing mode: 48 minutes (Production: 48 hours)
                    </p>
                    <p className={`text-sm ${isPast(manuscript.slaDeadline) ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                      Deadline: {format(manuscript.slaDeadline, 'MMM d, yyyy h:mm a')}
                    </p>
                    {isPast(manuscript.slaDeadline) && (
                      <p className="text-xs text-red-600 font-medium">
                        SLA Breached (BR-MAN-05)
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Version History */}
          {allVersions.length > 1 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-muted-foreground" />
                  <CardTitle className="text-base">Version History</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allVersions.map((v) => (
                    <div 
                      key={v.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 ${
                        v.id === manuscript.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => navigate(`manuscripts/${v.id}`)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">Version {v.version}</span>
                        <StatusBadge status={v.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(v.submittedAt, 'MMM d, h:mm a')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Issue 7 & 8: Annotations - Always visible inline form for Editors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Annotations</CardTitle>
              <CardDescription>
                {manuscript.annotations.length} annotation{manuscript.annotations.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Issue 8: Always-visible inline form for Editors (no "Add Annotation" button) */}
              {isEditor && (
                <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                  <p className="text-sm font-medium">Add Annotation</p>
                  <div className="space-y-2">
                    <Label htmlFor="page-number">Page Number *</Label>
                    <Input
                      id="page-number"
                      type="number"
                      min="1"
                      value={annotationPageNumber}
                      onChange={(e) => {
                        setAnnotationPageNumber(e.target.value)
                        setAnnotationError(null)
                      }}
                      placeholder="Enter page number"
                      className={annotationError?.includes('Page number') ? 'border-red-500' : ''}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="annotation-comment">Comment *</Label>
                    <Textarea
                      id="annotation-comment"
                      value={annotationComment}
                      onChange={(e) => {
                        setAnnotationComment(e.target.value)
                        setAnnotationError(null)
                      }}
                      placeholder="Enter annotation comment..."
                      rows={3}
                    />
                  </div>
                  {annotationError && (
                    <div className="flex items-center gap-2 text-red-500 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      {annotationError}
                    </div>
                  )}
                  <Button size="sm" onClick={handleAddAnnotation} className="w-full">
                    Save Annotation
                  </Button>
                </div>
              )}
              
              {/* Existing Annotations List */}
              {manuscript.annotations.length > 0 ? (
                <div className="space-y-3">
                  {manuscript.annotations.map((annotation) => (
                    <div key={annotation.id} className="p-3 rounded-lg bg-muted">
                      <p className="text-xs text-muted-foreground mb-1">
                        Page {annotation.pageNumber}
                      </p>
                      <p className="text-sm">{annotation.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No annotations yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Manuscript</DialogTitle>
            <DialogDescription>
              This manuscript will be marked as approved for publication.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Feedback (Optional)</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add any positive feedback or notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
              Approve Manuscript
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Manuscript</DialogTitle>
            <DialogDescription>
              The mangaka will have 3 days to address your feedback and resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Feedback *</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain what needs to be revised..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what needs improvement.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!feedback.trim()}
            >
              Reject with Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
