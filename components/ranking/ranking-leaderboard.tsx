'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store/app-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  BarChart3,
  Info,
  Gavel,
  Plus,
  Pencil,
} from 'lucide-react'
import { format } from 'date-fns'

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
  
  // State for ranking data entry form
  const [showDataEntryDialog, setShowDataEntryDialog] = useState(false)
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('')
  const [readerCountInput, setReaderCountInput] = useState('')
  const [voteCountInput, setVoteCountInput] = useState('')
  const [votePeriod, setVotePeriod] = useState('')
  const [dataEntryError, setDataEntryError] = useState<string | null>(null)
  
  // State for edit ranking dialog
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingRankingId, setEditingRankingId] = useState<string>('')
  const [editVoteCount, setEditVoteCount] = useState('')
  const [editReaderCount, setEditReaderCount] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  
  // Check if current user is Board Member (BR-RNK-02: Only Board Member role can access this form)
  const isBoardMember = state.currentUser.role === 'board' || state.currentUser.isBoardMember
  
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
    .sort((a, b) => {
      // Primary: Sort by vote rate descending
      if (b.voteRate !== a.voteRate) return b.voteRate - a.voteRate
      // Tiebreak 1: Higher total votes ranks higher
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount
      // Tiebreak 2: Earlier publication date ranks higher
      const aDate = a.series?.publicationDate?.getTime() || 0
      const bDate = b.series?.publicationDate?.getTime() || 0
      return aDate - bDate
    })
  
  // Recalculate positions based on vote rate
  const rankedWithPositions = rankedSeries.map((item, index) => ({
    ...item,
    calculatedPosition: index + 1,
  }))
  
  // Bottom 20% flagging logic: floor(totalSeries * 0.20), minimum 1
  // With 5 series: floor(5 * 0.20) = 1 series flagged (only rank #5)
  const totalSeries = rankedWithPositions.length
  const flaggedCount = Math.max(1, Math.floor(totalSeries * 0.20))
  const bottom20Threshold = totalSeries - flaggedCount // Series at positions > threshold are at risk
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
  
  // Get current vote period
  const getCurrentVotePeriod = () => {
    const now = new Date()
    const year = now.getFullYear()
    const week = Math.ceil((now.getDate() + 6 - now.getDay()) / 7)
    return `${year}-W${week.toString().padStart(2, '0')}`
  }
  
  // Handle ranking data entry form submission
  const handleDataEntrySubmit = () => {
    setDataEntryError(null)
    
    const readerCount = parseInt(readerCountInput, 10)
    const voteCount = parseInt(voteCountInput, 10)
    
    // BR-RNK-05: Reader Count must be > 0
    if (isNaN(readerCount) || readerCount <= 0) {
      setDataEntryError('Reader count must be greater than 0 (BR-RNK-05)')
      return
    }
    
    // BR-RNK-04: Vote Count cannot be negative
    if (isNaN(voteCount) || voteCount < 0) {
      setDataEntryError('Vote count cannot be negative (BR-RNK-04)')
      return
    }
    
    // BR-RNK-03: Vote Count cannot exceed Reader Count
    if (voteCount > readerCount) {
      setDataEntryError('Vote count cannot exceed reader count (BR-RNK-03)')
      return
    }
    
    // BR-RNK-06: Cannot submit duplicate entry for same series in same period
    const existingEntry = state.rankings.find(
      r => r.seriesId === selectedSeriesId && r.votePeriod === votePeriod
    )
    if (existingEntry) {
      setDataEntryError('Duplicate entry for same series in same period not allowed (BR-RNK-06)')
      return
    }
    
    // Calculate new score
    const newScore = Math.round((voteCount / readerCount) * 100 * 100) / 100
    
    // Create new ranking entry
    const newRanking = {
      id: `rank-${Date.now()}`,
      seriesId: selectedSeriesId,
      votePeriod: votePeriod,
      readerCount: readerCount,
      voteCount: voteCount,
      score: newScore,
      position: 0, // Will be recalculated
      trend: 'same' as const,
      flagged: newScore < 20, // Flag if below 20%
    }
    
    dispatch({ type: 'ADD_RANKING', payload: newRanking })
    
    // Reset form
    setShowDataEntryDialog(false)
    setSelectedSeriesId('')
    setReaderCountInput('')
    setVoteCountInput('')
    setVotePeriod('')
  }
  
  // Handle opening edit dialog
  const handleOpenEditDialog = (rankingId: string) => {
    const ranking = state.rankings.find(r => r.id === rankingId)
    if (!ranking) return
    
    setEditingRankingId(rankingId)
    setEditVoteCount(ranking.voteCount.toString())
    setEditReaderCount(ranking.readerCount.toString())
    setEditError(null)
    setShowEditDialog(true)
  }
  
  // Handle edit ranking submission - recalculates vote rate and re-sorts with tiebreak
  const handleEditRankingSubmit = () => {
    setEditError(null)
    
    const voteCount = parseInt(editVoteCount, 10)
    const readerCount = parseInt(editReaderCount, 10)
    
    // BR-RNK-05: Reader Count must be > 0
    if (isNaN(readerCount) || readerCount <= 0) {
      setEditError('Reader count must be greater than 0 (BR-RNK-05)')
      return
    }
    
    // BR-RNK-04: Vote Count cannot be negative
    if (isNaN(voteCount) || voteCount < 0) {
      setEditError('Vote count cannot be negative (BR-RNK-04)')
      return
    }
    
    // BR-RNK-03: Vote Count cannot exceed Reader Count
    if (voteCount > readerCount) {
      setEditError('Vote count cannot exceed reader count (BR-RNK-03)')
      return
    }
    
    const ranking = state.rankings.find(r => r.id === editingRankingId)
    if (!ranking) return
    
    // Calculate new vote rate
    const newScore = Math.round((voteCount / readerCount) * 100 * 100) / 100
    
    // Update ranking
    dispatch({
      type: 'UPDATE_RANKING',
      payload: {
        ...ranking,
        voteCount,
        readerCount,
        score: newScore,
        flagged: newScore < 20,
      }
    })
    
    setShowEditDialog(false)
    setEditingRankingId('')
    setEditVoteCount('')
    setEditReaderCount('')
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
        <div className="flex items-center gap-2">
          {/* BR-RNK-02: Enter Vote Data button visible only to Board Member role */}
          {isBoardMember && (
            <Button onClick={() => {
              setVotePeriod(getCurrentVotePeriod())
              setShowDataEntryDialog(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Enter Vote Data
            </Button>
          )}
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
                <TableHead className="text-center">Publication Date</TableHead>
                <TableHead className="text-center">Reader Count</TableHead>
                {isBoardMember && <TableHead className="w-20">Edit</TableHead>}
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
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {item.series?.publicationDate 
                        ? format(item.series.publicationDate, 'MMM dd, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">
                        {item.readerCount.toLocaleString()}
                      </span>
                    </TableCell>
                    {isBoardMember && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEditDialog(item.id)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    )}
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
      
      {/* Ranking Data Entry Dialog - BR-RNK-02: Only Board Member role can access */}
      <Dialog open={showDataEntryDialog} onOpenChange={(open) => {
        setShowDataEntryDialog(open)
        if (!open) {
          setDataEntryError(null)
          setSelectedSeriesId('')
          setReaderCountInput('')
          setVoteCountInput('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Vote Data</DialogTitle>
            <DialogDescription>
              Enter reader count and vote count for a series in the current voting period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="series">Series *</Label>
              <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
                <SelectTrigger id="series">
                  <SelectValue placeholder="Select a series" />
                </SelectTrigger>
                <SelectContent>
                  {state.series.filter(s => s.status === 'active').map(series => (
                    <SelectItem key={series.id} value={series.id}>
                      {series.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vote-period">Vote Period</Label>
              <Input 
                id="vote-period" 
                value={votePeriod} 
                onChange={(e) => setVotePeriod(e.target.value)}
                placeholder="e.g., 2024-W48"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reader-count">Reader Count *</Label>
              <Input 
                id="reader-count" 
                type="number"
                min="1"
                value={readerCountInput} 
                onChange={(e) => {
                  setReaderCountInput(e.target.value)
                  setDataEntryError(null)
                }}
                placeholder="Enter reader count (must be > 0)"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="vote-count">Vote Count *</Label>
              <Input 
                id="vote-count" 
                type="number"
                min="0"
                value={voteCountInput} 
                onChange={(e) => {
                  setVoteCountInput(e.target.value)
                  setDataEntryError(null)
                }}
                placeholder="Enter vote count (must be >= 0)"
              />
              <p className="text-xs text-muted-foreground">
                Vote count must be less than or equal to reader count
              </p>
            </div>
            
            {dataEntryError && (
              <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                <AlertTriangle className="h-4 w-4" />
                {dataEntryError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDataEntryDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDataEntrySubmit}
              disabled={!selectedSeriesId || !readerCountInput || !voteCountInput || !votePeriod}
            >
              Submit Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Ranking Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open)
        if (!open) {
          setEditError(null)
          setEditingRankingId('')
          setEditVoteCount('')
          setEditReaderCount('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vote Data</DialogTitle>
            <DialogDescription>
              Update the vote data for this series. Rankings will be automatically recalculated with tiebreak logic.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-vote-count">Total Votes *</Label>
              <Input 
                id="edit-vote-count" 
                type="number"
                min="0"
                value={editVoteCount} 
                onChange={(e) => {
                  setEditVoteCount(e.target.value)
                  setEditError(null)
                }}
                placeholder="Enter total votes"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-reader-count">Reader Count *</Label>
              <Input 
                id="edit-reader-count" 
                type="number"
                min="1"
                value={editReaderCount} 
                onChange={(e) => {
                  setEditReaderCount(e.target.value)
                  setEditError(null)
                }}
                placeholder="Enter reader count (must be > 0)"
              />
              <p className="text-xs text-muted-foreground">
                Vote Rate = (Total Votes / Reader Count) x 100%
              </p>
            </div>
            
            {editVoteCount && editReaderCount && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <span className="text-muted-foreground">New Vote Rate: </span>
                  <span className="font-semibold">
                    {calculateVoteRate(parseInt(editVoteCount, 10) || 0, parseInt(editReaderCount, 10) || 1)}%
                  </span>
                </p>
              </div>
            )}
            
            {editError && (
              <div className="flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md">
                <AlertTriangle className="h-4 w-4" />
                {editError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditRankingSubmit}
              disabled={!editVoteCount || !editReaderCount}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
