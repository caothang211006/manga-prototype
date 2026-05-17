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
  const { proposals, currentUser, series } = state

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
  const [voteValue, setVoteValue] = useState<'approve' | 'reject' | 'defer' | ''>('')
  const [voteComment, setVoteComment] = useState('')

  const isMangaka = currentUser.role === 'mangaka'
  const isBoard = currentUser.role === 'board'
  const isEditor = currentUser.role === 'editor'
  
  const isOwner = proposal?.mangakaId === currentUser.id
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
  const isConflicted = isBoard && (
    proposal?.mangakaId === currentUser.id ||
    series.some(s => s.proposalId === proposalId && s.editorId === currentUser.id)
  )
  const hasVoted = isBoard && proposal?.votes.some(v => v.boardMemberId === currentUser.id)
  
  // BR-11: Check if all eligible board members have voted
  const { users } = state
  const eligibleBoardMembers = users.filter(u => u.role === 'board' && u.id !== proposal?.mangakaId)
  const allMembersVoted = proposal && eligibleBoardMembers.every(
    member => proposal.votes.some(v => v.boardMemberId === member.id)
  )
  
  // BR-11: Cannot vote if all members have already voted
  const canVote = isBoard && proposal?.status === 'voting' && !hasVoted && !isConflicted && !allMembersVoted

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
        votingDeadline: addDays(new Date(), 7)
      }
    })
    setShowSubmitDialog(false)
  }

  const handleVote = () => {
    if (!voteValue) return
    
    const vote: Vote = {
      id: `vote-${Date.now()}`,
      proposalId: proposal.id,
      boardMemberId: currentUser.id,
      vote: voteValue,
      comment: voteComment || undefined,
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
    // If only quorum is reached but not all voted, keep window open until 7-day deadline
    if (allEligibleVoted && totalVotes >= 3) {
      // Calculate result when ALL eligible members have voted
      const approves = allVotes.filter(v => v.vote === 'approve').length
      const rejects = allVotes.filter(v => v.vote === 'reject').length
      
      let newStatus: Proposal['status'] = proposal.status
      let cooldownEnd: Date | undefined
      
      if (approves > rejects) {
        // Clear majority for approval
        newStatus = 'approved'
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
    
    setShowVoteDialog(false)
    setVoteValue('')
    setVoteComment('')
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
      
      {proposal.status === 'rejected' && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex items-center gap-4 p-4">
            <XCircle className="w-6 h-6 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Proposal Rejected</p>
              <p className="text-sm text-red-700">
                Unfortunately, your proposal was not approved at this time.
                {/* BR-RES-02: Tie = Rejected; Mangaka may resubmit after 30 days */}
              </p>
              <p className="text-xs text-red-600 mt-1">
                You may resubmit after the 30-day cooldown period (BR-RES-02).
              </p>
            </div>
            {proposal.rejectionCooldownEnd && !isPast(proposal.rejectionCooldownEnd) && (
              <div className="text-right">
                <p className="text-xs text-red-700">Cooldown ends</p>
                <CountdownTimer deadline={proposal.rejectionCooldownEnd} variant="compact" />
              </div>
            )}
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
                      Quorum reached ({proposal.votes.length}/3). Voting remains open until all {eligibleBoardMembers.length} eligible members vote or the 7-day window expires.
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

        {/* Sidebar */}
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
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Proposal for Review?</DialogTitle>
            <DialogDescription>
              Once submitted, your proposal will enter a 7-day voting period. You will not be able to edit it during this time.
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
      <Dialog open={showVoteDialog} onOpenChange={setShowVoteDialog}>
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
              <Select value={voteValue} onValueChange={(v) => setVoteValue(v as typeof voteValue)}>
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
            <div className="space-y-2">
              <Label>Comment (Optional)</Label>
              <Textarea
                value={voteComment}
                onChange={(e) => setVoteComment(e.target.value)}
                placeholder="Add a comment to explain your decision..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleVote} disabled={!voteValue}>
              Submit Vote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
