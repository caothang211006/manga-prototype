'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/ui/status-badge'
import { CountdownTimer } from '@/components/ui/countdown-timer'
import { QuorumBar } from '@/components/ui/progress-bar'
import { 
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Proposal, Vote } from '@/lib/store/types'

interface ProposalDetailProps {
  proposalId: string
}

export function ProposalDetail({ proposalId }: ProposalDetailProps) {
  const { state, dispatch, navigate, getUserById } = useApp()
  const { proposals, currentUser, series, users } = state

  const proposal = proposals.find(p => p.id === proposalId)
  const mangaka = proposal ? getUserById(proposal.mangakaId) : null

  const [isEditing, setIsEditing] = useState(proposalId === 'new')
  const [formData, setFormData] = useState({
    title: proposal?.title || '',
    genre: proposal?.genre || '',
    synopsis: proposal?.synopsis || '',
    sampleChapterUrl: proposal?.sampleChapterUrl || '',
  })
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [showVoteDialog, setShowVoteDialog] = useState(false)
  const [showVoteConfirmDialog, setShowVoteConfirmDialog] = useState(false) // Issue 5: Vote confirmation
  const [voteValue, setVoteValue] = useState<'approve' | 'reject' | 'defer' | ''>('')
  const [voteComment, setVoteComment] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState<string | null>(null)

  const isMangaka = currentUser.role === 'mangaka'
  // Fix: Check CURRENT ACTIVE ROLE, not user type
  // If current role = Editor → show full proposal detail
  // If current role = Board Member → show voting interface only
  const isBoard = currentUser.role === 'board'
  const isEditor = currentUser.role === 'editor'
  
  // For dual role users (like Hiroshi), the view depends on which role they selected
  // isBoardMember flag is only for checking voting eligibility, not for view restriction
  
  const isOwner = proposal?.mangakaId === currentUser.id
  
  // Check if voting window is still active for Board Members
  const isVotingWindowActive = proposal?.status === 'voting' && proposal?.votingDeadline && !isPast(proposal.votingDeadline)
  const canEdit = isOwner && proposal?.status === 'draft'
  
  // BR-01: Check if mangaka has an active proposal (draft/submitted/voting) other than this one
  const hasActiveProposal = proposals.some(
    p => p.mangakaId === currentUser.id && 
    ['draft', 'submitted', 'voting'].includes(p.status) &&
    p.id !== proposalId
  )
  
  // Form validation
  const isFormComplete = formData.title && formData.genre && formData.synopsis && formData.sampleChapterUrl
  
  // BR-01: Can submit only if form complete AND no other active proposal
  const canSubmit = isOwner && proposal?.status === 'draft' && isFormComplete && !hasActiveProposal
  
  // BR-01: Tooltip reason for disabled submit
  const submitBlockedReason = hasActiveProposal 
    ? 'Cannot submit - you already have 1 active proposal (BR-01). Wait for current proposal to be resolved.'
    : !isFormComplete 
      ? 'Please fill in all required fields'
      : null

  // Check for conflict of interest
  // Voting eligibility includes dual-role users with isBoardMember flag
  const canVoteAsBoard = isBoard || currentUser.isBoardMember
  
  const isConflicted = canVoteAsBoard && (
    proposal?.mangakaId === currentUser.id ||
    series.some(s => s.proposalId === proposalId && s.editorId === currentUser.id)
  )
  const hasVoted = canVoteAsBoard && proposal?.votes.some(v => v.boardMemberId === currentUser.id)
  
  // BR-11: Check if all eligible board members have voted
  const eligibleBoardMembers = users.filter(u => u.role === 'board' && u.id !== proposal?.mangakaId)
  const allMembersVoted = proposal && eligibleBoardMembers.every(
    member => proposal.votes.some(v => v.boardMemberId === member.id)
  )
  
  // BR-11: Cannot vote if all members have already voted
  // Voting eligibility is based on canVoteAsBoard (includes dual-role users)
  const canVote = canVoteAsBoard && proposal?.status === 'voting' && !hasVoted && !isConflicted && !allMembersVoted

  // Handle new proposal creation
  if (proposalId === 'new') {
    const handleSaveDraft = () => {
      const newProposal: Proposal = {
        id: `proposal-${Date.now()}`,
        title: formData.title,
        genre: formData.genre,
        synopsis: formData.synopsis,
        sampleChapterUrl: formData.sampleChapterUrl,
        status: 'draft',
        mangakaId: currentUser.id,
        createdAt: new Date(),
        votes: [],
      }
      dispatch({ type: 'ADD_PROPOSAL', payload: newProposal })
      navigate(`proposals/${newProposal.id}`)
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('proposals')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Proposal</h1>
            <p className="text-muted-foreground">Create a new manga proposal</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Proposal Details</CardTitle>
            <CardDescription>Fill in all fields to submit your proposal for review</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter your manga title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre *</Label>
              <Select
                value={formData.genre}
                onValueChange={(value) => setFormData({ ...formData, genre: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Action">Action</SelectItem>
                  <SelectItem value="Fantasy Adventure">Fantasy Adventure</SelectItem>
                  <SelectItem value="Sci-Fi Action">Sci-Fi Action</SelectItem>
                  <SelectItem value="Romance">Romance</SelectItem>
                  <SelectItem value="Comedy">Comedy</SelectItem>
                  <SelectItem value="Horror">Horror</SelectItem>
                  <SelectItem value="Sports">Sports</SelectItem>
                  <SelectItem value="Slice of Life">Slice of Life</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="synopsis">Synopsis *</Label>
              <Textarea
                id="synopsis"
                value={formData.synopsis}
                onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                placeholder="Describe your manga's story, characters, and themes..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                {formData.synopsis.length}/500 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sampleUrl">Sample Chapter URL *</Label>
              <Input
                id="sampleUrl"
                value={formData.sampleChapterUrl}
                onChange={(e) => setFormData({ ...formData, sampleChapterUrl: e.target.value })}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                Link to your sample chapter PDF or online viewer
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleSaveDraft}>
                Save as Draft
              </Button>
              {/* BR-01: Submit button disabled with tooltip if active proposal exists */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button 
                        onClick={() => setShowSubmitDialog(true)}
                        disabled={!isFormComplete || hasActiveProposal}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Submit for Review
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
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('proposals')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Proposals
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Proposal not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Board Members have NO access to proposal detail pages at all
  // They can only vote from the proposals list
  if (isBoard) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('proposals')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Proposals
        </Button>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-4 p-8">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900 text-lg">Access Restricted</p>
              <p className="text-sm text-amber-700 mt-1">
                Board Members do not have access to proposal detail pages to maintain voting impartiality.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                You can vote on proposals directly from the Proposals list page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleUpdate = () => {
    dispatch({
      type: 'UPDATE_PROPOSAL',
      payload: { ...proposal, ...formData }
    })
    setIsEditing(false)
  }

  const handleSubmit = () => {
    dispatch({
      type: 'UPDATE_PROPOSAL',
      payload: { 
        ...proposal, 
        ...formData,
        status: 'voting',
        submittedAt: new Date(),
        votingDeadline: addDays(new Date(), 3) // Testing mode: 3 days (production: 7 days)
      }
    })
    setShowSubmitDialog(false)
  }

  // Issue 5: Validate vote and show confirmation dialog
  const handleVoteValidation = () => {
    if (!voteValue) return
    
    // BR-VOT-02: Validate reason is required for reject
    if (voteValue === 'reject' && !voteComment.trim()) {
      setRejectReasonError('Reason is required (BR-VOT-02)')
      return
    }
    
    // Show confirmation dialog
    setShowVoteConfirmDialog(true)
  }

  // Issue 5: Confirm and submit the vote
  const handleVoteConfirm = () => {
    if (!voteValue) return
    
    const vote: Vote = {
      id: `vote-${Date.now()}`,
      proposalId: proposal.id,
      boardMemberId: currentUser.id,
      vote: voteValue,
      comment: voteComment.trim() || undefined,
      votedAt: new Date()
    }
    
    dispatch({ type: 'ADD_VOTE', payload: { proposalId: proposal.id, vote } })
    
    // BR-11: Calculate eligible members and check if ALL have voted
    const allVotes = [...proposal.votes, vote]
    const totalVotes = allVotes.length
    const eligibleCount = eligibleBoardMembers.length
    const allEligibleVoted = eligibleBoardMembers.every(
      member => allVotes.some(v => v.boardMemberId === member.id)
    )
    
    // Only close voting early if ALL eligible members have voted
    // If only quorum is reached but not all voted, keep window open until 3-day deadline (testing mode)
    if (allEligibleVoted && totalVotes >= 3) {
      // Calculate result when ALL eligible members have voted
      const approves = allVotes.filter(v => v.vote === 'approve').length
      const rejects = allVotes.filter(v => v.vote === 'reject').length
      
      let newStatus: Proposal['status'] = proposal.status
      let cooldownEnd: Date | undefined
      
      if (approves > rejects) {
        // Clear majority for approval
        newStatus = 'approved'
        
        // BR-RES-01: Auto-assign Tantou Editor with fewest active series
        // If tied, assign the Editor with the smallest editorID
        const editors = users.filter(u => u.role === 'editor')
        const editorCounts = editors.map(editor => {
          const activeSeriesCount = series.filter(
            s => s.editorId === editor.id && s.status === 'active'
          ).length
          return { editor, count: activeSeriesCount }
        })
        
        // Sort by count (ascending), then by id (ascending) for tiebreak
        editorCounts.sort((a, b) => {
          if (a.count !== b.count) return a.count - b.count
          return a.editor.id.localeCompare(b.editor.id)
        })
        
        const assignedEditor = editorCounts[0]?.editor
        
        // Create new series with auto-assigned Tantou Editor
        if (assignedEditor) {
          const newSeries = {
            id: `series-${Date.now()}`,
            title: proposal.title,
            genre: proposal.genre,
            status: 'active' as const,
            proposalId: proposal.id,
            mangakaId: proposal.mangakaId,
            editorId: assignedEditor.id,
            rankingScore: 0,
            createdAt: new Date(),
            publicationDate: new Date(), // Starts publishing from now
          }
          dispatch({ type: 'ADD_SERIES', payload: newSeries })
        }
      } else {
        // BR-RES-02: Tie (approves === rejects) OR more rejects → REJECTED
        // Mangaka may resubmit after 30 days
        newStatus = 'rejected'
        cooldownEnd = addDays(new Date(), 30)
      }
      
      dispatch({
        type: 'UPDATE_PROPOSAL',
        payload: { 
          ...proposal, 
          status: newStatus,
          rejectionCooldownEnd: cooldownEnd,
          votes: allVotes
        }
      })
    }
    
    setShowVoteConfirmDialog(false)
    setShowVoteDialog(false)
    setVoteValue('')
    setVoteComment('')
    setRejectReasonError(null)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('proposals')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{proposal.title}</h1>
              <StatusBadge status={proposal.status} />
            </div>
            <p className="text-muted-foreground">{proposal.genre}</p>
          </div>
        </div>
        {proposal.status === 'voting' && proposal.votingDeadline && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Voting ends</p>
            <CountdownTimer deadline={proposal.votingDeadline} />
          </div>
        )}
      </div>

      {/* Result Banner */}
      {proposal.status === 'approved' && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-center gap-4 p-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Proposal Approved!</p>
              <p className="text-sm text-emerald-700">
                Congratulations! Your manga has been approved for serialization.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Rejection Banner with 30-day cooldown - Only visible to Mangaka (proposal owner) - BR-RES-02 */}
      {proposal.status === 'rejected' && isOwner && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-red-900">Proposal Rejected</p>
                <p className="text-sm text-red-700 mt-1">
                  Unfortunately, your proposal was not approved at this time.
                </p>
                <p className="text-xs text-red-600 mt-2">
                  You may resubmit after the 30-day cooldown period (BR-RES-02).
                </p>
              </div>
              {proposal.rejectionCooldownEnd && !isPast(proposal.rejectionCooldownEnd) && (
                <div className="text-right bg-red-100 rounded-lg p-3">
                  <p className="text-xs text-red-700 font-medium mb-1">Cooldown remaining</p>
                  <CountdownTimer deadline={proposal.rejectionCooldownEnd} variant="compact" />
                  <p className="text-xs text-red-600 mt-1">
                    {format(proposal.rejectionCooldownEnd, 'MMM d, yyyy')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {proposal.status === 'deferred' && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-4 p-4">
            <Clock className="w-6 h-6 text-amber-600" />
            <div>
              <p className="font-semibold text-amber-900">Proposal Deferred</p>
              <p className="text-sm text-amber-700">
                Voting did not reach quorum (less than 3 votes). The proposal will be reconsidered.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Board Member Restricted View: Only show voting interface during active window, result after */}
          {/* Fix: Check CURRENT ACTIVE ROLE (isBoard), not user type (isBoardMember flag) */}
          {/* If current role = Editor → show full proposal detail */}
          {/* If current role = Board Member → show voting interface only, no proposal content */}
          {isBoard && (
            <>
              {/* If voting closed, Board Members only see result, not proposal content */}
              {!isVotingWindowActive && proposal.status !== 'voting' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Voting Result</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      {proposal.status === 'approved' && (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                          <span className="font-semibold text-emerald-700">Approved</span>
                        </>
                      )}
                      {proposal.status === 'rejected' && (
                        <>
                          <XCircle className="w-6 h-6 text-red-600" />
                          <span className="font-semibold text-red-700">Rejected</span>
                        </>
                      )}
                      {proposal.status === 'deferred' && (
                        <>
                          <Clock className="w-6 h-6 text-amber-600" />
                          <span className="font-semibold text-amber-700">Deferred</span>
                        </>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Board Members cannot view proposal details (synopsis, sample chapter, mangaka info) - only voting result is visible.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
          
          {/* Full Proposal Details - Hidden from Board Members (role=board only) */}
          {/* Editors (including dual-role users like Hiroshi when in Editor role) see full details */}
          {!isBoard && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Proposal Details</CardTitle>
                {canEdit && !isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Genre</Label>
                    <Select
                      value={formData.genre}
                      onValueChange={(value) => setFormData({ ...formData, genre: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Action">Action</SelectItem>
                        <SelectItem value="Fantasy Adventure">Fantasy Adventure</SelectItem>
                        <SelectItem value="Sci-Fi Action">Sci-Fi Action</SelectItem>
                        <SelectItem value="Romance">Romance</SelectItem>
                        <SelectItem value="Comedy">Comedy</SelectItem>
                        <SelectItem value="Horror">Horror</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Synopsis</Label>
                    <Textarea
                      value={formData.synopsis}
                      onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                      rows={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sample Chapter URL</Label>
                    <Input
                      value={formData.sampleChapterUrl}
                      onChange={(e) => setFormData({ ...formData, sampleChapterUrl: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdate}>Save Changes</Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="font-medium mb-2">Synopsis</h3>
                    <p className="text-muted-foreground leading-relaxed">{proposal.synopsis}</p>
                  </div>
                  {proposal.sampleChapterUrl && (
                    <div>
                      <h3 className="font-medium mb-2">Sample Chapter</h3>
                      <Button variant="outline" asChild>
                        <a href={proposal.sampleChapterUrl} target="_blank" rel="noopener noreferrer">
                          View Sample Chapter
                        </a>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          )}

          {/* Voting Section */}
          {proposal.status === 'voting' && (
            <Card>
              <CardHeader>
                <CardTitle>Voting Progress</CardTitle>
                <CardDescription>3 votes required to reach quorum</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* BR-11: Show banner when all eligible members voted early */}
                {allMembersVoted && (
                  <Alert className="border-emerald-200 bg-emerald-50/50">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-700">
                      All members voted - voting closed early
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* BR-11: Show banner when quorum reached but waiting for more votes */}
                {!allMembersVoted && proposal.votes.length >= 3 && (
                  <Alert className="border-blue-200 bg-blue-50/50">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-700">
                      Quorum reached ({proposal.votes.length}/3). Voting remains open until all {eligibleBoardMembers.length} eligible members vote or the 3-day window expires (testing mode).
                    </AlertDescription>
                  </Alert>
                )}
                
                <QuorumBar current={proposal.votes.length} required={3} />
                
                {proposal.votes.length > 0 && (
                  <div className="space-y-3 pt-4">
                    <h4 className="font-medium text-sm">Votes Cast</h4>
                    {proposal.votes.map((vote) => {
                      const voter = getUserById(vote.boardMemberId)
                      return (
                        <div key={vote.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs bg-violet-500 text-white">
                              {getInitials(voter?.name || 'Unknown')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{voter?.name}</span>
                              <StatusBadge 
                                status={vote.vote} 
                                variant={
                                  vote.vote === 'approve' ? 'success' : 
                                  vote.vote === 'reject' ? 'danger' : 
                                  'warning'
                                }
                              />
                            </div>
                            {vote.comment && (
                              <p className="text-sm text-muted-foreground mt-1">{vote.comment}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(vote.votedAt, 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {canVote && (
                  <Button className="w-full mt-4" onClick={() => setShowVoteDialog(true)}>
                    Cast Your Vote
                  </Button>
                )}

                {isConflicted && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-sm text-amber-700">
                      You cannot vote on this proposal due to conflict of interest.
                    </p>
                  </div>
                )}

                {hasVoted && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm text-emerald-700">
                      You have already voted on this proposal.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Hidden from Board Members role (they cannot see mangaka info) */}
        {/* Editors (including dual-role users) see full sidebar */}
        {!isBoard && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Proposal Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getInitials(mangaka?.name || 'Unknown')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{mangaka?.name}</p>
                  <p className="text-xs text-muted-foreground">Mangaka</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={proposal.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(proposal.createdAt, 'MMM d, yyyy')}</span>
                </div>
                {proposal.submittedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Submitted</span>
                    <span>{format(proposal.submittedAt, 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>

              {/* BR-01: Show submit button for draft proposals with tooltip if blocked */}
              {isOwner && proposal.status === 'draft' && (
                <>
                  <Separator />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-full">
                          <Button 
                            className="w-full" 
                            onClick={() => setShowSubmitDialog(true)}
                            disabled={!canSubmit}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Submit for Review
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
        )}
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Proposal for Review?</DialogTitle>
            <DialogDescription>
              Once submitted, your proposal will enter a 3-day voting period (testing mode). You will not be able to edit it during this time.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Make sure all details are correct before submitting:
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              <li><strong>Title:</strong> {formData.title}</li>
              <li><strong>Genre:</strong> {formData.genre}</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Confirm Submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={showVoteDialog} onOpenChange={(open) => {
        setShowVoteDialog(open)
        if (!open) {
          setVoteComment('')
          setRejectReasonError(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cast Your Vote</DialogTitle>
            <DialogDescription>
              Your vote will contribute to the final decision on this proposal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Your Decision *</Label>
              <Select value={voteValue} onValueChange={(v) => {
                setVoteValue(v as typeof voteValue)
                setRejectReasonError(null)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your vote" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Approve
                    </span>
                  </SelectItem>
                  <SelectItem value="reject">
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      Reject
                    </span>
                  </SelectItem>
                  <SelectItem value="defer">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Defer
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Single Comment/Reason field - Required for Reject, Optional otherwise */}
            <div className="space-y-2">
              <Label>Comment / Reason {voteValue === 'reject' ? '*' : '(Optional)'}</Label>
              <Textarea
                value={voteComment}
                onChange={(e) => {
                  setVoteComment(e.target.value)
                  if (e.target.value.trim()) {
                    setRejectReasonError(null)
                  }
                }}
                placeholder={voteValue === 'reject' 
                  ? "Please provide a reason for rejecting this proposal (required)..." 
                  : "Add a comment to explain your decision..."
                }
                rows={3}
                className={rejectReasonError ? 'border-red-500' : ''}
              />
              {rejectReasonError && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {rejectReasonError}
              </div>
            )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleVoteValidation} 
              disabled={!voteValue || (voteValue === 'reject' && !voteComment.trim())}
            >
              Submit Vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vote Confirmation Dialog - Issue 5: BR-VOT-01 */}
      <Dialog open={showVoteConfirmDialog} onOpenChange={setShowVoteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Vote</DialogTitle>
            <DialogDescription>
              Are you sure you want to vote <strong className="capitalize">{voteValue}</strong> for this proposal?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              This action cannot be undone (BR-VOT-01)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoteConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleVoteConfirm}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
