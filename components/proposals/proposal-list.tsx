'use client'

import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { CountdownTimer } from '@/components/ui/countdown-timer'
import { QuorumBar } from '@/components/ui/progress-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { 
  Plus,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { format, isPast, differenceInDays } from 'date-fns'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function ProposalList() {
  const { state, navigate, getUserById } = useApp()
  const { proposals, currentUser, users } = state

  const isMangaka = currentUser.role === 'mangaka'
  const isBoard = currentUser.role === 'board'
  const isEditor = currentUser.role === 'editor'
  
  // BR-08: Filter proposals based on role - Board and Editor cannot see drafts
  const visibleProposals = isMangaka 
    ? proposals.filter(p => p.mangakaId === currentUser.id)
    : proposals.filter(p => p.status !== 'draft') // BR-08: Hide drafts from Board/Editor

  // Check for cooldown (still applies to creating proposals)
  const cooldownProposal = isMangaka && proposals.find(
    p => p.mangakaId === currentUser.id && 
    p.status === 'rejected' && 
    p.rejectionCooldownEnd && 
    !isPast(p.rejectionCooldownEnd)
  )

  // BR-01: New Proposal button is always enabled for mangaka (can create drafts)
  // Only submission is blocked when active proposal exists
  const canCreateProposal = isMangaka && !cooldownProposal

  // Group proposals by status
  const activeProposals = visibleProposals.filter(p => ['voting', 'submitted'].includes(p.status))
  const draftProposals = visibleProposals.filter(p => p.status === 'draft')
  const pastProposals = visibleProposals.filter(p => ['approved', 'rejected', 'deferred'].includes(p.status))

  // BR-11: Check if all eligible board members have voted for each proposal in voting
  const getEligibleBoardMembers = () => users.filter(u => u.role === 'board')
  const checkAllVoted = (proposal: typeof proposals[0]) => {
    if (proposal.status !== 'voting') return false
    const eligibleMembers = getEligibleBoardMembers()
    // Board members with conflict of interest are not eligible
    const eligibleIds = eligibleMembers
      .filter(m => m.id !== proposal.mangakaId)
      .map(m => m.id)
    return eligibleIds.every(id => proposal.votes.some(v => v.boardMemberId === id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proposals</h1>
          <p className="text-muted-foreground">
            {isMangaka ? 'Manage your manga proposals' : 'Review and vote on manga proposals'}
          </p>
        </div>
        {isMangaka && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  {/* BR-01: New Proposal button always enabled - can create drafts anytime */}
                  <Button 
                    onClick={() => navigate('proposals/new')}
                    disabled={!canCreateProposal}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Proposal
                  </Button>
                </div>
              </TooltipTrigger>
              {!canCreateProposal && cooldownProposal && (
                <TooltipContent>
                  {`Cooldown active until ${format(cooldownProposal.rejectionCooldownEnd!, 'MMM d, yyyy')}`}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Cooldown Alert */}
      {cooldownProposal && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-4 p-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-900">Rejection Cooldown Active</p>
              <p className="text-sm text-amber-700">
                You can submit a new proposal after {format(cooldownProposal.rejectionCooldownEnd!, 'MMMM d, yyyy')}
              </p>
            </div>
            <CountdownTimer deadline={cooldownProposal.rejectionCooldownEnd!} variant="compact" />
          </CardContent>
        </Card>
      )}

      {/* Active Proposals (Voting/Submitted) */}
      {activeProposals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Active Proposals</h2>
          <div className="grid gap-4">
            {activeProposals.map((proposal) => {
              const mangaka = getUserById(proposal.mangakaId)
              const hasVoted = isBoard && proposal.votes.some(v => v.boardMemberId === currentUser.id)
              const allVoted = checkAllVoted(proposal)
              
              return (
                <Card 
                  key={proposal.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`proposals/${proposal.id}`)}
                >
                  <CardContent className="p-6">
                    {/* BR-11: Show banner when all eligible members voted early */}
                    {allVoted && proposal.status === 'voting' && (
                      <Alert className="mb-4 border-emerald-200 bg-emerald-50/50">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <AlertDescription className="text-emerald-700">
                          All members voted - voting closed early
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{proposal.title}</h3>
                          <StatusBadge status={proposal.status} />
                          {isBoard && hasVoted && (
                            <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                              Voted
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{proposal.genre}</p>
                        {!isMangaka && (
                          <p className="text-xs text-muted-foreground">By {mangaka?.name}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{proposal.synopsis}</p>
                      </div>
                      {proposal.status === 'voting' && proposal.votingDeadline && !allVoted && (
                        <div className="text-right ml-4">
                          <p className="text-xs text-muted-foreground mb-1">Voting ends</p>
                          <CountdownTimer deadline={proposal.votingDeadline} variant="compact" />
                        </div>
                      )}
                    </div>
                    {proposal.status === 'voting' && (
                      <div className="mt-4">
                        <QuorumBar current={proposal.votes.length} required={3} />
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Submitted {proposal.submittedAt ? format(proposal.submittedAt, 'MMM d, yyyy') : '-'}
                      </span>
                      {/* BR-11: Disable vote button if all members voted */}
                      {isBoard && !hasVoted && proposal.status === 'voting' && !allVoted && (
                        <Button size="sm">
                          Cast Vote <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Draft Proposals (Mangaka only) */}
      {isMangaka && draftProposals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Drafts</h2>
          <div className="grid gap-4">
            {draftProposals.map((proposal) => (
              <Card 
                key={proposal.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`proposals/${proposal.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">{proposal.title || 'Untitled Proposal'}</h3>
                        <StatusBadge status="draft" />
                      </div>
                      <p className="text-sm text-muted-foreground">{proposal.genre || 'No genre specified'}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Continue Editing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Proposals */}
      {pastProposals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Past Proposals</h2>
          <div className="grid gap-4">
            {pastProposals.map((proposal) => {
              const mangaka = getUserById(proposal.mangakaId)
              
              return (
                <Card 
                  key={proposal.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow opacity-80"
                  onClick={() => navigate(`proposals/${proposal.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold">{proposal.title}</h3>
                          <StatusBadge status={proposal.status} />
                        </div>
                        <p className="text-sm text-muted-foreground">{proposal.genre}</p>
                        {!isMangaka && (
                          <p className="text-xs text-muted-foreground">By {mangaka?.name}</p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {proposal.submittedAt ? format(proposal.submittedAt, 'MMM d, yyyy') : '-'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {visibleProposals.length === 0 && (
        <EmptyState
          icon="document"
          title={isMangaka ? 'No proposals yet' : 'No proposals to review'}
          description={isMangaka 
            ? 'Create your first manga proposal to get started'
            : 'There are no proposals awaiting review at this time'
          }
          action={isMangaka && canCreateProposal ? {
            label: 'Create Proposal',
            onClick: () => navigate('proposals/new')
          } : undefined}
        />
      )}
    </div>
  )
}
