'use client'

import { useApp } from '@/lib/store/app-context'
import { MangakaDashboard } from '@/components/dashboards/mangaka-dashboard'
import { AssistantDashboard } from '@/components/dashboards/assistant-dashboard'
import { EditorDashboard } from '@/components/dashboards/editor-dashboard'
import { BoardDashboard } from '@/components/dashboards/board-dashboard'
import { ProposalList } from '@/components/proposals/proposal-list'
import { ProposalDetail } from '@/components/proposals/proposal-detail'
import { SeriesList } from '@/components/series/series-list'
import { ChapterList } from '@/components/series/chapter-list'
import { ChapterDetail } from '@/components/series/chapter-detail'
import { TaskList } from '@/components/tasks/task-list'
import { ManuscriptList } from '@/components/manuscripts/manuscript-list'
import { ManuscriptReview } from '@/components/manuscripts/manuscript-review'
import { RankingLeaderboard } from '@/components/ranking/ranking-leaderboard'
import { DecisionList } from '@/components/decisions/decision-list'
import { DecisionSession } from '@/components/decisions/decision-session'
import { NotificationList } from '@/components/notifications/notification-list'

export function AppRouter() {
  const { state } = useApp()
  const { currentRoute, currentUser } = state

  // Parse route segments
  const segments = currentRoute.split('/')
  const baseRoute = segments[0]
  const id = segments[1]
  const subRoute = segments[2]
  const subId = segments[3]

  // Dashboard routing based on role
  if (baseRoute === 'dashboard') {
    switch (currentUser.role) {
      case 'mangaka':
        return <MangakaDashboard />
      case 'assistant':
        return <AssistantDashboard />
      case 'editor':
        return <EditorDashboard />
      case 'board':
        return <BoardDashboard />
      default:
        return <MangakaDashboard />
    }
  }

  // Proposals
  if (baseRoute === 'proposals') {
    if (id) {
      return <ProposalDetail proposalId={id} />
    }
    return <ProposalList />
  }

  // Series
  if (baseRoute === 'series') {
    if (id && subRoute === 'chapters') {
      if (subId) {
        return <ChapterDetail chapterId={subId} />
      }
      return <ChapterList seriesId={id} />
    }
    if (id) {
      return <ChapterList seriesId={id} />
    }
    return <SeriesList />
  }

  // Tasks
  if (baseRoute === 'tasks') {
    return <TaskList />
  }

  // Manuscripts
  if (baseRoute === 'manuscripts') {
    if (id) {
      return <ManuscriptReview manuscriptId={id} />
    }
    return <ManuscriptList />
  }

  // Rankings
  if (baseRoute === 'rankings') {
    return <RankingLeaderboard />
  }

  // Decisions
  if (baseRoute === 'decisions') {
    if (id) {
      return <DecisionSession sessionId={id} />
    }
    return <DecisionList />
  }

  // Notifications
  if (baseRoute === 'notifications') {
    return <NotificationList />
  }

  // Default to dashboard
  switch (currentUser.role) {
    case 'mangaka':
      return <MangakaDashboard />
    case 'assistant':
      return <AssistantDashboard />
    case 'editor':
      return <EditorDashboard />
    case 'board':
      return <BoardDashboard />
    default:
      return <MangakaDashboard />
  }
}
