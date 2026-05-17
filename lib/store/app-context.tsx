'use client'

import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { AppState, AppAction, User } from './types'
import { appReducer } from './reducers'
import {
  mockUsers,
  mockProposals,
  mockSeries,
  mockChapters,
  mockTasks,
  mockManuscripts,
  mockRankings,
  mockDecisionSessions,
  mockNotifications,
} from './mock-data'

const initialState: AppState = {
  currentUser: mockUsers[0], // Default to Mangaka
  users: mockUsers,
  proposals: mockProposals,
  series: mockSeries,
  chapters: mockChapters,
  tasks: mockTasks,
  manuscripts: mockManuscripts,
  rankings: mockRankings,
  decisionSessions: mockDecisionSessions,
  notifications: mockNotifications,
  currentRoute: 'dashboard',
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  // Helper functions
  setCurrentUser: (user: User) => void
  navigate: (route: string) => void
  getUserById: (id: string) => User | undefined
  getSeriesById: (id: string) => typeof initialState.series[0] | undefined
  getChapterById: (id: string) => typeof initialState.chapters[0] | undefined
  getTasksByChapterId: (chapterId: string) => typeof initialState.tasks
  getManuscriptsByChapterId: (chapterId: string) => typeof initialState.manuscripts
  getChaptersBySeriesId: (seriesId: string) => typeof initialState.chapters
  getRankingBySeriesId: (seriesId: string) => typeof initialState.rankings[0] | undefined
  getDecisionSessionBySeriesId: (seriesId: string) => typeof initialState.decisionSessions[0] | undefined
  getUnreadNotificationCount: () => number
  getUserNotifications: () => typeof initialState.notifications
  // BR-RES-01: Get Tantou Editor with fewest active series
  getNextTantouEditor: () => User | undefined
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const setCurrentUser = (user: User) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user })
  }

  const navigate = (route: string) => {
    dispatch({ type: 'SET_ROUTE', payload: route })
  }

  const getUserById = (id: string) => state.users.find((u) => u.id === id)

  const getSeriesById = (id: string) => state.series.find((s) => s.id === id)

  const getChapterById = (id: string) => state.chapters.find((c) => c.id === id)

  const getTasksByChapterId = (chapterId: string) =>
    state.tasks.filter((t) => t.chapterId === chapterId)

  const getManuscriptsByChapterId = (chapterId: string) =>
    state.manuscripts.filter((m) => m.chapterId === chapterId)

  const getChaptersBySeriesId = (seriesId: string) =>
    state.chapters.filter((c) => c.seriesId === seriesId)

  const getRankingBySeriesId = (seriesId: string) =>
    state.rankings.find((r) => r.seriesId === seriesId)

  const getDecisionSessionBySeriesId = (seriesId: string) =>
    state.decisionSessions.find((d) => d.seriesId === seriesId)

  const getUnreadNotificationCount = () =>
    state.notifications.filter(
      (n) => !n.read && n.userId === state.currentUser.id
    ).length

  const getUserNotifications = () =>
    state.notifications.filter((n) => n.userId === state.currentUser.id)

  // BR-RES-01: Get Tantou Editor with fewest active series
  // If tied, assign the Editor with the smallest editorID
  const getNextTantouEditor = (): User | undefined => {
    // Get all editors
    const editors = state.users.filter(u => u.role === 'editor')
    
    if (editors.length === 0) return undefined
    
    // Count active series for each editor
    const editorCounts = editors.map(editor => {
      const activeSeriesCount = state.series.filter(
        s => s.editorId === editor.id && s.status === 'active'
      ).length
      return { editor, count: activeSeriesCount }
    })
    
    // Sort by count (ascending), then by id (ascending) for tiebreak
    editorCounts.sort((a, b) => {
      if (a.count !== b.count) return a.count - b.count
      return a.editor.id.localeCompare(b.editor.id)
    })
    
    return editorCounts[0]?.editor
  }

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        setCurrentUser,
        navigate,
        getUserById,
        getSeriesById,
        getChapterById,
        getTasksByChapterId,
        getManuscriptsByChapterId,
        getChaptersBySeriesId,
        getRankingBySeriesId,
        getDecisionSessionBySeriesId,
        getUnreadNotificationCount,
        getUserNotifications,
        getNextTantouEditor,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
