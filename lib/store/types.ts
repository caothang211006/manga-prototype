// User Roles
export type UserRole = 'mangaka' | 'assistant' | 'editor' | 'board'

export interface User {
  id: string
  name: string
  role: UserRole
  avatar?: string
  isBoardMember?: boolean // For dual role users (e.g., Editor + Board Member)
  conflictSeries?: string[] // Series IDs where this user has conflict of interest (e.g., Tantou Editor)
}

// Proposal
export type ProposalStatus = 'draft' | 'submitted' | 'voting' | 'approved' | 'rejected' | 'deferred'

export interface Vote {
  id: string
  proposalId: string
  boardMemberId: string
  vote: 'approve' | 'reject' | 'defer'
  comment?: string
  votedAt: Date
}

export interface Proposal {
  id: string
  title: string
  genre: string
  synopsis: string
  sampleChapterUrl: string
  status: ProposalStatus
  mangakaId: string
  createdAt: Date
  submittedAt?: Date
  votingDeadline?: Date
  votes: Vote[]
  rejectionCooldownEnd?: Date
}

// Series
export type SeriesStatus = 'active' | 'cancelled'

export interface Series {
  id: string
  title: string
  genre: string
  status: SeriesStatus
  proposalId: string
  mangakaId: string
  editorId: string
  rankingScore: number
  coverImage?: string
  createdAt: Date
  publicationDate: Date // First publication date of the series
}

// Chapter
export type ChapterStatus = 'in-progress' | 'complete' | 'published'

export interface Chapter {
  id: string
  seriesId: string
  chapterNumber: number
  title: string
  deadline: Date
  publicationDate: Date
  status: ChapterStatus
  progress: number
}

// Task
export type TaskType = 'sketch' | 'inking' | 'screentone' | 'background'
export type TaskStatus = 'pending' | 'in-progress' | 'submitted' | 'approved' | 'rejected' | 'overdue' | 'delayed'

export interface Task {
  id: string
  chapterId: string
  pageRange: string
  taskType: TaskType
  assignedTo: string
  dueDate: Date
  status: TaskStatus
  rejectionCount: number
  rejectionComment?: string
  submittedAt?: Date
}

// Manuscript
export type ManuscriptStatus = 'pending' | 'approved' | 'rejected'

export interface Annotation {
  id: string
  pageNumber: number
  x: number
  y: number
  comment: string
  createdAt: Date
}

export interface Manuscript {
  id: string
  chapterId: string
  version: number
  fileUrl: string
  submittedAt: Date
  status: ManuscriptStatus
  slaDeadline: Date
  annotations: Annotation[]
  feedback?: string
  reviewedAt?: Date
}

// Ranking
export type RankingTrend = 'up' | 'down' | 'same'

export interface RankingEntry {
  id: string
  seriesId: string
  votePeriod: string
  readerCount: number
  voteCount: number
  score: number
  position: number
  trend: RankingTrend
  flagged: boolean
}

// Decision Session
export type DecisionStatus = 'open' | 'finalized' | 'pending-quorum'

export interface DecisionVote {
  id: string
  sessionId: string
  boardMemberId: string
  decision: 'cancel' | 'change-publication-type' | 'keep'
  reason?: string // Required for 'cancel' decision
  newPublicationType?: string // Required for 'change-publication-type' decision
  votedAt: Date
}

export interface DecisionSession {
  id: string
  seriesId: string
  status: DecisionStatus
  votes: DecisionVote[]
  createdAt: Date
  finalizedAt?: Date
  outcome?: 'cancelled' | 'publication-type-changed' | 'kept'
  newPublicationType?: string // Set if outcome is 'publication-type-changed'
}

// Notification
export type NotificationType = 'deadline' | 'sla' | 'vote' | 'approval' | 'rejection' | 'alert'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: Date
  link?: string
}

// App State
export interface AppState {
  currentUser: User
  users: User[]
  proposals: Proposal[]
  series: Series[]
  chapters: Chapter[]
  tasks: Task[]
  manuscripts: Manuscript[]
  rankings: RankingEntry[]
  decisionSessions: DecisionSession[]
  notifications: Notification[]
  currentRoute: string
}

// Actions
export type AppAction =
  | { type: 'SET_CURRENT_USER'; payload: User }
  | { type: 'SET_ROUTE'; payload: string }
  | { type: 'ADD_PROPOSAL'; payload: Proposal }
  | { type: 'UPDATE_PROPOSAL'; payload: Proposal }
  | { type: 'ADD_VOTE'; payload: { proposalId: string; vote: Vote } }
  | { type: 'ADD_SERIES'; payload: Series }
  | { type: 'UPDATE_SERIES'; payload: Series }
  | { type: 'ADD_CHAPTER'; payload: Chapter }
  | { type: 'UPDATE_CHAPTER'; payload: Chapter }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'ADD_MANUSCRIPT'; payload: Manuscript }
  | { type: 'UPDATE_MANUSCRIPT'; payload: Manuscript }
  | { type: 'ADD_RANKING'; payload: RankingEntry }
  | { type: 'UPDATE_RANKING'; payload: RankingEntry }
  | { type: 'ADD_DECISION_SESSION'; payload: DecisionSession }
  | { type: 'UPDATE_DECISION_SESSION'; payload: DecisionSession }
  | { type: 'ADD_DECISION_VOTE'; payload: { sessionId: string; vote: DecisionVote } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
