'use client'

import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { CountdownTimer } from '@/components/ui/countdown-timer'
import { QuorumBar } from '@/components/ui/progress-bar'
import { EmptyState } from '@/components/ui/empty-state'
import { 
  FileText, 
  Trophy,
  Gavel,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

export function BoardDashboard() {
  const { state, navigate, getSeriesById } = useApp()
  const { proposals, rankings, decisionSessions, currentUser } = state

  // Get active voting sessions
  const activeProposals = proposals.filter(p => p.status === 'voting')
  
  // Check if current user has voted on each proposal
  const proposalsNeedingVote = activeProposals.filter(p => 
    !p.votes.some(v => v.boardMemberId === currentUser.id)
  )

  // Get open decision sessions
  const openDecisions = decisionSessions.filter(d => d.status === 'open')
  
  // Check if current user has voted on each decision
  const decisionsNeedingVote = openDecisions.filter(d => {
    // Check if user is excluded (is the editor of the series)
    const series = getSeriesById(d.seriesId)
    if (series?.editorId === currentUser.id) return false
    
    return !d.votes.some(v => v.boardMemberId === currentUser.id)
  })

  // Get top rankings
  const topRankings = [...rankings]
    .sort((a, b) => a.position - b.position)
    .slice(0, 6)

  // Get flagged series count
  const flaggedCount = rankings.filter(r => r.flagged).length

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'same' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500" />
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('proposals')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Votes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{proposalsNeedingVote.length}</div>
            <p className="text-xs text-muted-foreground">
              Proposals awaiting your vote
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('decisions')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Decisions</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{decisionsNeedingVote.length}</div>
            <p className="text-xs text-muted-foreground">
              Series decisions pending
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('rankings')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rankings</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rankings.length}</div>
            <p className="text-xs text-muted-foreground">
              Series in current ranking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${flaggedCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {flaggedCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Bottom 20% series
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Votes Alert */}
      {proposalsNeedingVote.length > 0 && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-600" />
              <CardTitle className="text-violet-900">Proposals Awaiting Your Vote</CardTitle>
            </div>
            <CardDescription className="text-violet-700">
              Your vote is needed to reach quorum on these proposals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proposalsNeedingVote.map((proposal) => (
                <div 
                  key={proposal.id} 
                  className="p-4 bg-white rounded-lg border border-violet-100 cursor-pointer hover:bg-violet-50/50"
                  onClick={() => navigate(`proposals/${proposal.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{proposal.title}</h4>
                      <p className="text-sm text-muted-foreground">{proposal.genre}</p>
                    </div>
                    {proposal.votingDeadline && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Voting ends</p>
                        <CountdownTimer deadline={proposal.votingDeadline} variant="compact" />
                      </div>
                    )}
                  </div>
                  <QuorumBar current={proposal.votes.length} required={3} />
                  <Button className="mt-3 w-full" size="sm">
                    Cast Your Vote <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Decision Sessions */}
      {decisionsNeedingVote.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-amber-600" />
              <CardTitle className="text-amber-900">Series Decisions Pending</CardTitle>
            </div>
            <CardDescription className="text-amber-700">
              Vote on the future of flagged series
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {decisionsNeedingVote.map((session) => {
                const series = getSeriesById(session.seriesId)
                const ranking = rankings.find(r => r.seriesId === session.seriesId)
                
                return (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-100 cursor-pointer hover:bg-amber-50/50"
                    onClick={() => navigate(`decisions/${session.id}`)}
                  >
                    <div>
                      <h4 className="font-medium">{series?.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        Current ranking: #{ranking?.position} ({ranking?.score}%)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Votes</p>
                        <p className="font-medium">{session.votes.length}/3</p>
                      </div>
                      <Button size="sm" variant="outline">
                        Vote <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking Leaderboard Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Rankings</CardTitle>
              <CardDescription>Series performance overview</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('rankings')}>
              Full Leaderboard
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {topRankings.length === 0 ? (
            <EmptyState 
              icon="inbox" 
              title="No rankings available" 
              description="Rankings will appear once vote data is submitted."
            />
          ) : (
            <div className="space-y-2">
              {topRankings.map((ranking) => {
                const series = getSeriesById(ranking.seriesId)
                
                return (
                  <div 
                    key={ranking.id} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      ranking.flagged ? 'bg-red-50 border border-red-100' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        ranking.position === 1 ? 'bg-yellow-400 text-yellow-900' :
                        ranking.position === 2 ? 'bg-gray-300 text-gray-700' :
                        ranking.position === 3 ? 'bg-amber-600 text-white' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {ranking.position}
                      </div>
                      <div>
                        <p className="font-medium">{series?.title}</p>
                        <p className="text-xs text-muted-foreground">{series?.genre}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <TrendIcon trend={ranking.trend} />
                      <div className="text-right min-w-[60px]">
                        <p className={`text-lg font-bold ${
                          ranking.flagged ? 'text-red-600' : 
                          ranking.score >= 50 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {ranking.score}%
                        </p>
                      </div>
                      {ranking.flagged && (
                        <StatusBadge status="flagged" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('rankings')}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Enter Vote Data</h3>
              <p className="text-sm text-muted-foreground">Submit reader and vote counts for ranking</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('proposals')}>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Review Proposals</h3>
              <p className="text-sm text-muted-foreground">View all submitted manga proposals</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
