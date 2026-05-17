'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Gavel,
  Ban,
  RefreshCw,
  ThumbsUp,
  BarChart3,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { formatDistanceToNow, format } from 'date-fns'
import { DecisionVote } from '@/lib/store/types'

const QUORUM_REQUIRED = 3
const PUBLICATION_TYPES = [
  'Weekly',
  'Bi-weekly', 
  'Monthly',
  'Online-only',
  'Special Edition',
]

interface DecisionSessionProps {
  sessionId: string
}

// Calculate vote rate formula: (voteCount / readerCount) × 100%
function calculateVoteRate(voteCount: number, readerCount: number): number {
  if (readerCount === 0) return 0
  return Math.round((voteCount / readerCount) * 100 * 100) / 100
}

export function DecisionSession({ sessionId }: DecisionSessionProps) {
  const { state, dispatch, getUserById, getSeriesById, getRankingBySeriesId } = useApp()
  const [selectedDecision, setSelectedDecision] = useState<'cancel' | 'change-publication-type' | 'keep' | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [newPublicationType, setNewPublicationType] = useState<string>('')
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  const session = state.decisionSessions.find(d => d.id === sessionId)
  
  if (!session) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Decision session not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => dispatch({ type: 'SET_ROUTE', payload: 'decisions' })}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Decisions
        </Button>
      </div>
    )
  }
  
  const series = getSeriesById(session.seriesId)
  const ranking = getRankingBySeriesId(session.seriesId)
  
  // Calculate vote rate from ranking data
  const voteRate = ranking ? calculateVoteRate(ranking.voteCount, ranking.readerCount) : 0
  
  // Check if current user is Board Member (including dual role users)
  const isBoardMember = state.currentUser.role === 'board' || state.currentUser.isBoardMember
  
  // Check if current user is Tantou Editor of this series (conflict of interest)
  const isTantouEditor = series?.editorId === state.currentUser.id
  
  // Check if current user has already voted
  const hasVoted = session.votes.some(v => v.boardMemberId === state.currentUser.id)
  
  // Vote counts
  const totalVotes = session.votes.length
  const quorumMet = totalVotes >= QUORUM_REQUIRED
  const isFinalized = session.status === 'finalized'
  
  // Calculate vote breakdown
  const voteBreakdown = useMemo(() => {
    const breakdown = {
      cancel: 0,
      'change-publication-type': 0,
      keep: 0,
    }
    session.votes.forEach(v => {
      breakdown[v.decision]++
    })
    return breakdown
  }, [session.votes])
  
  // Determine final outcome when quorum is met
  const determinedOutcome = useMemo(() => {
    if (!quorumMet) return null
    
    // Find the decision with most votes
    const entries = Object.entries(voteBreakdown) as [keyof typeof voteBreakdown, number][]
    const maxVotes = Math.max(...entries.map(([, count]) => count))
    const winners = entries.filter(([, count]) => count === maxVotes)
    
    // If tie, no clear outcome yet
    if (winners.length > 1) return null
    
    return winners[0][0]
  }, [voteBreakdown, quorumMet])
  
  const handleVoteSubmit = () => {
    // Validation
    if (!selectedDecision) {
      setValidationError('Please select a vote option')
      return
    }
    
    if (selectedDecision === 'cancel' && !cancelReason.trim()) {
      setValidationError('Reason is required (BR-DEC-05)')
      return
    }
    
    if (selectedDecision === 'change-publication-type' && !newPublicationType) {
      setValidationError('Please select a new publication type')
      return
    }
    
    setValidationError(null)
    setShowConfirmDialog(true)
  }
  
  const confirmVote = () => {
    const newVote: DecisionVote = {
      id: `dv-${Date.now()}`,
      sessionId: session.id,
      boardMemberId: state.currentUser.id,
      decision: selectedDecision!,
      reason: selectedDecision === 'cancel' ? cancelReason.trim() : undefined,
      newPublicationType: selectedDecision === 'change-publication-type' ? newPublicationType : undefined,
      votedAt: new Date(),
    }
    
    dispatch({
      type: 'ADD_DECISION_VOTE',
      payload: {
        sessionId: session.id,
        vote: newVote,
      },
    })
    
    // Check if quorum is now met
    const newTotalVotes = totalVotes + 1
    if (newTotalVotes >= QUORUM_REQUIRED) {
      // Calculate new outcome
      const newBreakdown = { ...voteBreakdown }
      newBreakdown[selectedDecision!]++
      
      const entries = Object.entries(newBreakdown) as [keyof typeof newBreakdown, number][]
      const maxVotes = Math.max(...entries.map(([, count]) => count))
      const winners = entries.filter(([, count]) => count === maxVotes)
      
      if (winners.length === 1) {
        const winningDecision = winners[0][0]
        let outcome: 'cancelled' | 'publication-type-changed' | 'kept'
        
        switch (winningDecision) {
          case 'cancel':
            outcome = 'cancelled'
            break
          case 'change-publication-type':
            outcome = 'publication-type-changed'
            break
          default:
            outcome = 'kept'
        }
        
        // Finalize the session
        dispatch({
          type: 'UPDATE_DECISION_SESSION',
          payload: {
            ...session,
            votes: [...session.votes, newVote],
            status: 'finalized',
            finalizedAt: new Date(),
            outcome,
            newPublicationType: winningDecision === 'change-publication-type' 
              ? newPublicationType 
              : undefined,
          },
        })
        
        // If cancelled, update series status
        if (outcome === 'cancelled' && series) {
          dispatch({
            type: 'UPDATE_SERIES',
            payload: {
              ...series,
              status: 'cancelled',
            },
          })
        }
      }
    }
    
    setShowConfirmDialog(false)
    setSelectedDecision(null)
    setCancelReason('')
    setNewPublicationType('')
  }
  
  const getDecisionIcon = (decision: string) => {
    switch (decision) {
      case 'cancel':
        return <Ban className="h-4 w-4 text-destructive" />
      case 'change-publication-type':
        return <RefreshCw className="h-4 w-4 text-amber-500" />
      case 'keep':
        return <ThumbsUp className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }
  
  const getDecisionLabel = (decision: string) => {
    switch (decision) {
      case 'cancel':
        return 'Cancel'
      case 'change-publication-type':
        return 'Change Publication Type'
      case 'keep':
        return 'Keep'
      default:
        return decision
    }
  }
  
  const getOutcomeDisplay = () => {
    if (!session.outcome) return null
    
    switch (session.outcome) {
      case 'cancelled':
        return {
          label: 'Cancelled',
          icon: <Ban className="h-5 w-5" />,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10 border-destructive',
        }
      case 'publication-type-changed':
        return {
          label: `Publication Type Changed to ${session.newPublicationType}`,
          icon: <RefreshCw className="h-5 w-5" />,
          color: 'text-amber-600',
          bgColor: 'bg-amber-500/10 border-amber-500',
        }
      case 'kept':
        return {
          label: 'Kept (No Change)',
          icon: <ThumbsUp className="h-5 w-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-500/10 border-green-500',
        }
      default:
        return null
    }
  }
  
  const outcomeDisplay = getOutcomeDisplay()
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => dispatch({ type: 'SET_ROUTE', payload: 'decisions' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Decision Session</h1>
            <Badge variant={session.status === 'open' ? 'default' : 'secondary'}>
              {session.status === 'open' ? 'Open' : 'Finalized'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Review and vote on the future of this series
          </p>
        </div>
      </div>
      
      {/* Series Info Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Series Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="text-muted-foreground">Series Name</Label>
              <p className="text-lg font-semibold">{series?.title || 'Unknown Series'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Genre</Label>
              <p className="font-medium">{series?.genre || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Current Vote Rate</Label>
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="text-lg px-3 py-1">
                  {voteRate}%
                </Badge>
                <span className="text-xs text-muted-foreground">(Bottom 20%)</span>
              </div>
            </div>
          </div>
          {ranking && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground">Total Votes</Label>
                  <p className="font-medium">{ranking.voteCount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Reader Count</Label>
                  <p className="font-medium">{ranking.readerCount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Rank Position</Label>
                  <p className="font-medium">#{ranking.position}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Conflict of Interest Warning - BR-DEC-02 */}
      {isTantouEditor && (
        <Card className="border-amber-500 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-700">Conflict of Interest</p>
              <p className="text-sm text-muted-foreground">
                You cannot vote due to conflict of interest (BR-DEC-02)
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Final Decision Display (after quorum) */}
      {isFinalized && outcomeDisplay && (
        <Card className={outcomeDisplay.bgColor}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${outcomeDisplay.color}`}>
              {outcomeDisplay.icon}
              Final Decision: {outcomeDisplay.label}
            </CardTitle>
            <CardDescription>
              Decision finalized on {format(new Date(session.finalizedAt!), 'PPP')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      <div className="grid gap-6 md:grid-cols-3">
        {/* Vote Section (Left Column) */}
        <div className="md:col-span-2 space-y-6">
          {/* Voting Controls - Only show for Board Members who haven't voted and no conflict */}
          {isBoardMember && !hasVoted && !isTantouEditor && session.status === 'open' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Cast Your Vote
                </CardTitle>
                <CardDescription>
                  Select your decision and submit. You can only vote once and cannot change your vote after submission.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup
                  value={selectedDecision || ''}
                  onValueChange={(value) => {
                    setSelectedDecision(value as 'cancel' | 'change-publication-type' | 'keep')
                    setValidationError(null)
                  }}
                  className="space-y-4"
                >
                  {/* Cancel Option */}
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="cancel" id="cancel" className="mt-1" />
                    <div className="flex-1 space-y-3">
                      <Label htmlFor="cancel" className="flex items-center gap-2 text-base font-medium cursor-pointer">
                        <Ban className="h-4 w-4 text-destructive" />
                        Cancel Series
                      </Label>
                      {selectedDecision === 'cancel' && (
                        <div className="space-y-2">
                          <Label htmlFor="cancel-reason" className="text-sm">
                            Reason (required)
                          </Label>
                          <Textarea
                            id="cancel-reason"
                            placeholder="Please provide a written reason for cancellation..."
                            value={cancelReason}
                            onChange={(e) => {
                              setCancelReason(e.target.value)
                              setValidationError(null)
                            }}
                            className="min-h-[100px]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Change Publication Type Option */}
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="change-publication-type" id="change-type" className="mt-1" />
                    <div className="flex-1 space-y-3">
                      <Label htmlFor="change-type" className="flex items-center gap-2 text-base font-medium cursor-pointer">
                        <RefreshCw className="h-4 w-4 text-amber-500" />
                        Change Publication Type
                      </Label>
                      {selectedDecision === 'change-publication-type' && (
                        <div className="space-y-2">
                          <Label htmlFor="new-type" className="text-sm">
                            New Publication Type
                          </Label>
                          <Select
                            value={newPublicationType}
                            onValueChange={(value) => {
                              setNewPublicationType(value)
                              setValidationError(null)
                            }}
                          >
                            <SelectTrigger id="new-type">
                              <SelectValue placeholder="Select new type..." />
                            </SelectTrigger>
                            <SelectContent>
                              {PUBLICATION_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Keep Option */}
                  <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="keep" id="keep" className="mt-1" />
                    <Label htmlFor="keep" className="flex items-center gap-2 text-base font-medium cursor-pointer">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      Keep (No Change)
                    </Label>
                  </div>
                </RadioGroup>
                
                {validationError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    {validationError}
                  </div>
                )}
                
                <Button 
                  onClick={handleVoteSubmit}
                  disabled={!selectedDecision}
                  className="w-full"
                >
                  Submit Vote
                </Button>
              </CardContent>
            </Card>
          )}
          
          {/* Already Voted Message */}
          {hasVoted && (
            <Card className="border-green-500 bg-green-500/5">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Vote Submitted</p>
                  <p className="text-sm text-muted-foreground">
                    Your vote has been recorded and cannot be changed.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Vote History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Votes ({totalVotes} / {QUORUM_REQUIRED} required)
              </CardTitle>
              <CardDescription>
                {quorumMet 
                  ? 'Quorum has been reached' 
                  : `${QUORUM_REQUIRED - totalVotes} more vote(s) needed for quorum`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.votes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No votes submitted yet</p>
              ) : (
                <div className="space-y-4">
                  {session.votes.map((vote) => {
                    const voter = getUserById(vote.boardMemberId)
                    return (
                      <div key={vote.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {voter?.name.slice(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{voter?.name || vote.boardMemberId}</span>
                            <Badge 
                              variant={
                                vote.decision === 'cancel' ? 'destructive' : 
                                vote.decision === 'keep' ? 'default' : 
                                'secondary'
                              } 
                              className="text-xs"
                            >
                              {getDecisionIcon(vote.decision)}
                              <span className="ml-1">{getDecisionLabel(vote.decision)}</span>
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(vote.votedAt), { addSuffix: true })}
                            </span>
                          </div>
                          {vote.reason && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Reason: {vote.reason}
                            </p>
                          )}
                          {vote.newPublicationType && (
                            <p className="text-sm text-muted-foreground mt-1">
                              New Type: {vote.newPublicationType}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column - Vote Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vote Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4 text-destructive" />
                    <span>Cancel</span>
                  </div>
                  <span className="text-xl font-bold text-destructive">{voteBreakdown.cancel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-amber-500" />
                    <span>Change Type</span>
                  </div>
                  <span className="text-xl font-bold text-amber-600">{voteBreakdown['change-publication-type']}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                    <span>Keep</span>
                  </div>
                  <span className="text-xl font-bold text-green-600">{voteBreakdown.keep}</span>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span>Quorum Progress</span>
                  <Badge variant={quorumMet ? 'default' : 'secondary'}>
                    {totalVotes}/{QUORUM_REQUIRED}
                  </Badge>
                </div>
                <Progress value={(totalVotes / QUORUM_REQUIRED) * 100} />
              </div>
              
              {quorumMet && !isFinalized && determinedOutcome && (
                <div className="pt-2">
                  <Label className="text-muted-foreground">Pending Outcome</Label>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    {getDecisionIcon(determinedOutcome)}
                    {getDecisionLabel(determinedOutcome)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Session Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Created</Label>
                <p className="font-medium">{format(new Date(session.createdAt), 'PPP')}</p>
              </div>
              {session.finalizedAt && (
                <div>
                  <Label className="text-muted-foreground">Finalized</Label>
                  <p className="font-medium">{format(new Date(session.finalizedAt), 'PPP')}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge variant={session.status === 'open' ? 'default' : 'secondary'} className="ml-2">
                  {session.status === 'open' ? 'Voting Open' : 'Finalized'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Vote</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to vote: <strong>{getDecisionLabel(selectedDecision || '')}</strong>
              </p>
              {selectedDecision === 'cancel' && cancelReason && (
                <p>
                  <strong>Reason:</strong> {cancelReason}
                </p>
              )}
              {selectedDecision === 'change-publication-type' && newPublicationType && (
                <p>
                  <strong>New Type:</strong> {newPublicationType}
                </p>
              )}
              <p className="text-destructive font-medium mt-4">
                This action cannot be undone. You will not be able to change your vote after submission.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVote}>
              Confirm Vote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
