'use client'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Gavel,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  AlertTriangle,
  Eye,
  Ban,
  RefreshCw,
  ThumbsUp,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { format, formatDistanceToNow } from 'date-fns'
import type { DecisionSession } from '@/lib/store/types'

function getStatusBadge(status: DecisionSession['status']) {
  switch (status) {
    case 'open':
      return (
        <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
          <Clock className="h-3 w-3 mr-1" />
          Open
        </Badge>
      )
    case 'finalized':
      return (
        <Badge variant="secondary">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Finalized
        </Badge>
      )
    case 'pending-quorum':
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          Pending Quorum
        </Badge>
      )
    default:
      return (
        <Badge variant="outline">
          <XCircle className="h-3 w-3 mr-1" />
          Unknown
        </Badge>
      )
  }
}

// Get outcome badge for finalized sessions
function getOutcomeBadge(outcome?: DecisionSession['outcome'], newPubType?: string) {
  switch (outcome) {
    case 'kept':
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <ThumbsUp className="h-3 w-3 mr-1" />
          Kept
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge variant="destructive">
          <Ban className="h-3 w-3 mr-1" />
          Cancelled
        </Badge>
      )
    case 'publication-type-changed':
      return (
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 border-amber-500">
          <RefreshCw className="h-3 w-3 mr-1" />
          Changed to {newPubType}
        </Badge>
      )
    default:
      return <Badge variant="outline">Pending</Badge>
  }
}

// Get decision type display
function getDecisionType(outcome?: DecisionSession['outcome']) {
  switch (outcome) {
    case 'kept':
      return 'Keep Series'
    case 'cancelled':
      return 'Cancellation'
    case 'publication-type-changed':
      return 'Publication Change'
    default:
      return 'Pending'
  }
}

export function DecisionList() {
  const { state, dispatch } = useApp()
  
  // Split into Active (open, pending-quorum) and History (finalized)
  const openSessions = state.decisionSessions.filter(d => d.status === 'open' || d.status === 'pending-quorum')
  const closedSessions = state.decisionSessions.filter(d => d.status === 'finalized')
  
  const handleViewSession = (sessionId: string) => {
    dispatch({ type: 'SET_ROUTE', payload: `decisions/${sessionId}` })
  }
  
  const isBoardMember = state.currentUser.role === 'board'
  
  // Active Sessions Table
  const renderActiveSessionTable = (sessions: DecisionSession[]) => {
    if (sessions.length === 0) {
      return (
        <EmptyState
          icon={Gavel}
          title="No active sessions"
          description="No decision sessions requiring votes at this time"
        />
      )
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Series</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Votes</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map(session => {
            const series = state.series.find(s => s.id === session.seriesId)
            const hasVoted = session.votes.some(v => v.boardMemberId === state.currentUser.id)
            const hasConflict = series?.editorId === state.currentUser.id
            
            // Count votes by decision type (new types)
            const votesCancel = session.votes.filter(v => v.decision === 'cancel').length
            const votesChange = session.votes.filter(v => v.decision === 'change-publication-type').length
            const votesKeep = session.votes.filter(v => v.decision === 'keep').length
            
            return (
              <TableRow key={session.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{series?.title || 'Unknown Series'}</p>
                    {hasConflict && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Conflict of interest
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(session.status)}</TableCell>
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="outline">{session.votes.length} / 3</Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <p>Cancel: {votesCancel}</p>
                          <p>Change Type: {votesChange}</p>
                          <p>Keep: {votesKeep}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={session.status === 'open' && isBoardMember && !hasVoted && !hasConflict ? 'default' : 'outline'}
                          onClick={() => handleViewSession(session.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {session.status === 'open' && isBoardMember && !hasVoted && !hasConflict 
                            ? 'Vote' 
                            : 'View'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {hasConflict
                          ? 'You cannot vote due to conflict of interest'
                          : hasVoted
                            ? 'You have already voted'
                            : session.status !== 'open'
                              ? 'Session is closed'
                              : 'Cast your vote'}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }
  
  // History Table with different columns: Series | Decision Type | Result | Date | Votes
  const renderHistoryTable = (sessions: DecisionSession[]) => {
    if (sessions.length === 0) {
      return (
        <EmptyState
          icon={Gavel}
          title="No decision history"
          description="Past decisions will appear here once sessions are finalized"
        />
      )
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Series</TableHead>
            <TableHead>Decision Type</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-center">Votes</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map(session => {
            const series = state.series.find(s => s.id === session.seriesId)
            
            return (
              <TableRow key={session.id}>
                <TableCell>
                  <p className="font-medium">{series?.title || 'Unknown Series'}</p>
                  <p className="text-xs text-muted-foreground">{series?.genre}</p>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{getDecisionType(session.outcome)}</span>
                </TableCell>
                <TableCell>
                  {getOutcomeBadge(session.outcome, session.newPublicationType)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {session.finalizedAt 
                    ? format(new Date(session.finalizedAt), 'MMM d, yyyy')
                    : 'N/A'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{session.votes.length}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewSession(session.id)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Decision Sessions</h1>
        <p className="text-muted-foreground">
          Board voting sessions for series fate decisions (Bottom 20% flagged series)
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Sessions</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {openSessions.length}
              {openSessions.length > 0 && <Clock className="h-5 w-5 text-blue-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Auto-triggered for Bottom 20% series
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your Pending Votes</CardDescription>
            <CardTitle className="text-3xl">
              {isBoardMember
                ? openSessions.filter(s => {
                    const series = state.series.find(ser => ser.id === s.seriesId)
                    const hasConflict = series?.editorId === state.currentUser.id
                    return !s.votes.some(v => v.boardMemberId === state.currentUser.id) && !hasConflict
                  }).length
                : '-'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {isBoardMember ? 'Sessions requiring your vote' : 'Only Board members can vote'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Closed</CardDescription>
            <CardTitle className="text-3xl">{closedSessions.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Historical decisions
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Sessions
          </CardTitle>
          <CardDescription>
            View and participate in decision sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList>
              <TabsTrigger value="active" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Active Sessions ({openSessions.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Decision History ({closedSessions.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="mt-4">
              {renderActiveSessionTable(openSessions)}
            </TabsContent>
            
            <TabsContent value="history" className="mt-4">
              {renderHistoryTable(closedSessions)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
