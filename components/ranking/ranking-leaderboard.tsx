'use client'

import { useEffect, useRef } from 'react'
import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  BarChart3,
  Info,
  Gavel,
} from 'lucide-react'

// Correct formula per business rules: Ranking Score = (voteCount / readerCount) × 100%
function calculateVoteRate(voteCount: number, readerCount: number): number {
  if (readerCount === 0) return 0
  return Math.round((voteCount / readerCount) * 100 * 100) / 100 // Round to 2 decimal places
}

function getTrendIcon(trend: 'up' | 'down' | 'same') {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />
  }
}

function getRankBadge(position: number, total: number) {
  const percentile = (position / total) * 100
  
  if (position <= 3) {
    return (
      <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
        <Trophy className="h-3 w-3 mr-1" />
        #{position}
      </Badge>
    )
  }
  
  if (percentile <= 20) {
    return <Badge variant="default">#{position}</Badge>
  }
  
  if (percentile > 80) {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        #{position}
      </Badge>
    )
  }
  
  return <Badge variant="secondary">#{position}</Badge>
}

export function RankingLeaderboard() {
  const { state, dispatch } = useApp()
  const autoTriggerRef = useRef(false)
  
  const canTriggerReview = state.currentUser.role === 'board' || state.currentUser.role === 'editor'
  
  // Get rankings with calculated vote rates
  const rankedSeries = [...state.rankings]
    .map(ranking => {
      const series = state.series.find(s => s.id === ranking.seriesId)
      const voteRate = calculateVoteRate(ranking.voteCount, ranking.readerCount)
      return {
        ...ranking,
        series,
        voteRate,
      }
    })
    .filter(r => r.series) // Only include rankings with valid series
    .sort((a, b) => b.voteRate - a.voteRate) // Sort by vote rate descending
  
  // Recalculate positions based on vote rate
  const rankedWithPositions = rankedSeries.map((item, index) => ({
    ...item,
    calculatedPosition: index + 1,
  }))
  
  const bottom20Threshold = Math.ceil(rankedWithPositions.length * 0.8)
  const atRiskSeries = rankedWithPositions.filter((_, index) => index + 1 > bottom20Threshold)
  
  // Auto-trigger decision sessions for Bottom 20% series
  // This simulates what happens when a ranking period closes
  useEffect(() => {
    if (autoTriggerRef.current) return // Only run once
    autoTriggerRef.current = true
    
    const boardMembers = state.users.filter(u => u.role === 'board')
    
    atRiskSeries.forEach(riskItem => {
      const series = riskItem.series
      if (!series) return
      
      // Check if there's already an open session for this series
      const existingSession = state.decisionSessions.find(
        d => d.seriesId === series.id && d.status === 'open'
      )
      
      if (!existingSession) {
        // Auto-create decision session
        const newSessionId = `decision-auto-${series.id}-${Date.now()}`
        const newSession = {
          id: newSessionId,
          seriesId: series.id,
          status: 'open' as const,
          createdAt: new Date(),
          votes: [],
        }
        
        dispatch({ type: 'ADD_DECISION_SESSION', payload: newSession })
        
        // Notify all board members (except those with conflict of interest)
        boardMembers.forEach(boardMember => {
          // Skip if board member is the Tantou Editor of this series (conflict of interest)
          if (series.editorId === boardMember.id) return
          
          const notification = {
            id: `notif-decision-${newSessionId}-${boardMember.id}`,
            userId: boardMember.id,
            type: 'vote' as const,
            title: 'Decision Session Auto-Triggered',
            message: `"${series.title}" is in Bottom 20% and requires your vote. Vote Rate: ${riskItem.voteRate}%`,
            read: false,
            createdAt: new Date(),
            link: `/decisions/${newSessionId}`,
          }
          
          dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
        })
      }
    })
  }, [atRiskSeries, state.decisionSessions, state.users, dispatch])
  
  const handleTriggerReview = (seriesId: string) => {
    const series = state.series.find(s => s.id === seriesId)
    if (!series) return
    
    const existingSession = state.decisionSessions.find(
      d => d.seriesId === seriesId && d.status === 'open'
    )
    
    if (existingSession) {
      dispatch({ type: 'SET_ROUTE', payload: `decisions/${existingSession.id}` })
      return
    }
    
    const newSession = {
      id: `decision-${Date.now()}`,
      seriesId,
      status: 'open' as const,
      createdAt: new Date(),
      votes: [],
    }
    
    dispatch({ type: 'ADD_DECISION_SESSION', payload: newSession })
    dispatch({ type: 'SET_ROUTE', payload: `decisions/${newSession.id}` })
  }
  
  // Calculate average vote rate
  const avgVoteRate = rankedWithPositions.length > 0
    ? Math.round(rankedWithPositions.reduce((acc, s) => acc + s.voteRate, 0) / rankedWithPositions.length * 100) / 100
    : 0
  
  // Calculate total votes
  const totalVotes = rankedWithPositions.reduce((acc, s) => acc + s.voteCount, 0)
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Series Rankings</h1>
          <p className="text-muted-foreground">
            Rankings based on Vote Rate formula: (Total Votes / Reader Count) x 100%
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold mb-1">Vote Rate Formula</p>
              <p className="text-xs mb-2">
                Vote Rate = (Total Votes / Reader Count) x 100%
              </p>
              <p className="text-xs text-muted-foreground">
                Series in bottom 20% are flagged for review
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Ranked Series</CardDescription>
            <CardTitle className="text-3xl">{rankedWithPositions.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Active series in ranking
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Vote Rate</CardDescription>
            <CardTitle className="text-3xl">
              {avgVoteRate}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across all ranked series
            </p>
          </CardContent>
        </Card>
        
        <Card className={atRiskSeries.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>At-Risk Series</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {atRiskSeries.length}
              {atRiskSeries.length > 0 && (
                <AlertTriangle className="h-6 w-6 text-destructive" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Bottom 20% requiring review
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Leaderboard
          </CardTitle>
          <CardDescription>
            All series ranked by vote rate performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Series</TableHead>
                <TableHead className="text-center">Trend</TableHead>
                <TableHead className="text-right">Vote Rate (%)</TableHead>
                <TableHead className="text-right">Total Votes</TableHead>
                <TableHead className="text-center">Rank Position</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedWithPositions.map((item) => {
                const isAtRisk = item.calculatedPosition > bottom20Threshold
                const hasOpenSession = state.decisionSessions.some(
                  d => d.seriesId === item.seriesId && d.status === 'open'
                )
                
                return (
                  <TableRow 
                    key={item.id}
                    className={isAtRisk ? 'bg-destructive/5' : ''}
                  >
                    <TableCell>
                      {getRankBadge(item.calculatedPosition, rankedWithPositions.length)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.series?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.series?.mangakaId === state.currentUser.id ? 'Your series' : item.series?.genre}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getTrendIcon(item.trend)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={item.voteRate >= 70 ? 'default' : item.voteRate >= 50 ? 'secondary' : 'destructive'}
                        className="text-sm font-bold"
                      >
                        {item.voteRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.voteCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${isAtRisk ? 'text-destructive' : ''}`}>
                        #{item.calculatedPosition}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isAtRisk && canTriggerReview && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant={hasOpenSession ? 'outline' : 'destructive'}
                                onClick={() => handleTriggerReview(item.seriesId)}
                              >
                                <Gavel className="h-3 w-3 mr-1" />
                                {hasOpenSession ? 'View' : 'Review'}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {hasOpenSession
                                ? 'View ongoing decision session'
                                : 'Trigger cancellation review session'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
