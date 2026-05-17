import { AppState, AppAction } from './types'

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload }

    case 'SET_ROUTE':
      return { ...state, currentRoute: action.payload }

    case 'ADD_PROPOSAL':
      return { ...state, proposals: [...state.proposals, action.payload] }

    case 'UPDATE_PROPOSAL':
      return {
        ...state,
        proposals: state.proposals.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      }

    case 'ADD_VOTE': {
      const { proposalId, vote } = action.payload
      return {
        ...state,
        proposals: state.proposals.map((p) =>
          p.id === proposalId ? { ...p, votes: [...p.votes, vote] } : p
        ),
      }
    }

    case 'ADD_SERIES':
      return { ...state, series: [...state.series, action.payload] }

    case 'UPDATE_SERIES':
      return {
        ...state,
        series: state.series.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      }

    case 'ADD_CHAPTER':
      return { ...state, chapters: [...state.chapters, action.payload] }

    case 'UPDATE_CHAPTER':
      return {
        ...state,
        chapters: state.chapters.map((c) =>
          c.id === action.payload.id ? action.payload : c
        ),
      }

    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] }

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      }

    case 'ADD_MANUSCRIPT':
      return { ...state, manuscripts: [...state.manuscripts, action.payload] }

    case 'UPDATE_MANUSCRIPT':
      return {
        ...state,
        manuscripts: state.manuscripts.map((m) =>
          m.id === action.payload.id ? action.payload : m
        ),
      }

    case 'ADD_RANKING':
      return { ...state, rankings: [...state.rankings, action.payload] }

    case 'UPDATE_RANKING':
      return {
        ...state,
        rankings: state.rankings.map((r) =>
          r.id === action.payload.id ? action.payload : r
        ),
      }

    case 'ADD_DECISION_SESSION':
      return { ...state, decisionSessions: [...state.decisionSessions, action.payload] }

    case 'UPDATE_DECISION_SESSION':
      return {
        ...state,
        decisionSessions: state.decisionSessions.map((d) =>
          d.id === action.payload.id ? action.payload : d
        ),
      }

    case 'ADD_DECISION_VOTE': {
      const { sessionId, vote } = action.payload
      return {
        ...state,
        decisionSessions: state.decisionSessions.map((d) =>
          d.id === sessionId ? { ...d, votes: [...d.votes, vote] } : d
        ),
      }
    }

    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] }

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      }

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      }

    default:
      return state
  }
}
