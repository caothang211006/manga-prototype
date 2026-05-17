import {
  User,
  Proposal,
  Series,
  Chapter,
  Task,
  Manuscript,
  RankingEntry,
  DecisionSession,
  Notification,
  Vote,
  DecisionVote,
} from './types'

// Helper to create dates relative to now
const daysFromNow = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

const daysAgo = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

// Users
export const mockUsers: User[] = [
  { id: 'user-1', name: 'Yuki Tanaka', role: 'mangaka' },
  { id: 'user-2', name: 'Kenji Sato', role: 'assistant' },
  { id: 'user-3', name: 'Aiko Mori', role: 'assistant' },
  // Hiroshi Yamamoto has dual role: Tantou Editor AND Board Member
  { id: 'user-4', name: 'Hiroshi Yamamoto / Editor + Board Member', role: 'editor', isBoardMember: true },
  { id: 'user-5', name: 'Board Member A', role: 'board' },
  { id: 'user-6', name: 'Board Member B', role: 'board' },
  // Board Member C: active, no conflict of interest
  { id: 'bm-c', name: 'Board Member C', role: 'board' },
  // Board Member D: active, is Tantou Editor of Shadow Chronicles (series-2) - has conflict of interest
  { id: 'bm-d', name: 'Board Member D', role: 'board' },
  // Board Member E: active, has conflict of interest on Shadow Chronicles
  { id: 'bm-e', name: 'Board Member E (Conflict - Shadow Chronicles)', role: 'board' },
]

// Proposals
export const mockProposals: Proposal[] = [
  {
    id: 'proposal-1',
    title: 'Cyber Ninja',
    genre: 'Sci-Fi Action',
    synopsis: 'In a dystopian future where ancient martial arts meet cutting-edge technology, a young ninja must navigate the neon-lit streets of Neo-Tokyo to uncover the truth behind her clan\'s destruction. Armed with cybernetic enhancements and traditional katana skills, she becomes the city\'s last hope against a corrupt megacorporation.',
    sampleChapterUrl: '/samples/cyber-ninja-ch1.pdf',
    status: 'voting',
    mangakaId: 'user-1',
    createdAt: daysAgo(14),
    submittedAt: daysAgo(7),
    votingDeadline: daysFromNow(7),
    votes: [
      { id: 'vote-1', proposalId: 'proposal-1', boardMemberId: 'user-5', vote: 'approve', comment: 'Strong premise and art style.', votedAt: daysAgo(3) },
      { id: 'vote-2', proposalId: 'proposal-1', boardMemberId: 'user-6', vote: 'approve', comment: 'Great potential for long-running series.', votedAt: daysAgo(1) },
    ],
  },
  // BR-01 test: Draft proposal to show blocked submit state
  {
    id: 'proposal-draft-1',
    title: 'Midnight Samurai',
    genre: 'Historical Drama',
    synopsis: 'A ronin wanders through Edo-period Japan seeking redemption...',
    sampleChapterUrl: '',
    status: 'draft',
    mangakaId: 'user-1',
    createdAt: daysAgo(2),
    votes: [],
  },
]

// Series
export const mockSeries: Series[] = [
  {
    id: 'series-1',
    title: "Dragon's Destiny",
    genre: 'Fantasy Adventure',
    status: 'active',
    proposalId: 'proposal-old-1',
    mangakaId: 'user-1',
    editorId: 'user-4',
    rankingScore: 85,
    createdAt: daysAgo(365),
  },
  {
    id: 'series-2',
    title: 'Shadow Chronicles',
    genre: 'Dark Fantasy',
    status: 'active',
    proposalId: 'proposal-old-2',
    mangakaId: 'user-1',
    editorId: 'bm-d', // Board Member D is Tantou Editor - conflict of interest for decisions
    rankingScore: 15,
    createdAt: daysAgo(180),
  },
  {
    id: 'series-3',
    title: 'Lost Legends',
    genre: 'Historical Drama',
    status: 'cancelled',
    proposalId: 'proposal-old-3',
    mangakaId: 'user-1',
    editorId: 'user-4',
    rankingScore: 8,
    createdAt: daysAgo(400),
  },
  {
    id: 'series-4',
    title: 'Cosmic Warriors',
    genre: 'Space Opera',
    status: 'active',
    proposalId: 'proposal-old-4',
    mangakaId: 'user-1',
    editorId: 'user-4',
    rankingScore: 72,
    createdAt: daysAgo(200),
  },
  {
    id: 'series-5',
    title: 'Kitchen Battle',
    genre: 'Cooking Comedy',
    status: 'active',
    proposalId: 'proposal-old-5',
    mangakaId: 'user-1',
    editorId: 'user-4',
    rankingScore: 45,
    createdAt: daysAgo(150),
  },
  {
    id: 'series-6',
    title: 'Spirit Hunter',
    genre: 'Supernatural Horror',
    status: 'active',
    proposalId: 'proposal-old-6',
    mangakaId: 'user-1',
    editorId: 'user-4',
    rankingScore: 18,
    createdAt: daysAgo(120),
  },
]

// Chapters
export const mockChapters: Chapter[] = [
  {
    id: 'chapter-1',
    seriesId: 'series-1',
    chapterNumber: 7,
    title: 'The Ancient Gate Opens',
    deadline: daysFromNow(10),
    publicationDate: daysFromNow(14),
    status: 'in-progress',
    progress: 75,
  },
  {
    id: 'chapter-2',
    seriesId: 'series-1',
    chapterNumber: 6,
    title: 'Shadows of the Past',
    deadline: daysAgo(7),
    publicationDate: daysAgo(3),
    status: 'published',
    progress: 100,
  },
  {
    id: 'chapter-3',
    seriesId: 'series-2',
    chapterNumber: 4,
    title: 'Into the Void',
    deadline: daysFromNow(5),
    publicationDate: daysFromNow(9),
    status: 'in-progress',
    progress: 30,
  },
]

// Tasks
export const mockTasks: Task[] = [
  {
    id: 'task-1',
    chapterId: 'chapter-1',
    pageRange: '1-5',
    taskType: 'sketch',
    assignedTo: 'user-2',
    dueDate: daysAgo(2),
    status: 'approved',
    rejectionCount: 0,
    submittedAt: daysAgo(3),
  },
  {
    id: 'task-2',
    chapterId: 'chapter-1',
    pageRange: '6-10',
    taskType: 'sketch',
    assignedTo: 'user-3',
    dueDate: daysAgo(1),
    status: 'approved',
    rejectionCount: 1,
    rejectionComment: 'Line work needs refinement in panel 3.',
    submittedAt: daysAgo(2),
  },
  {
    id: 'task-3',
    chapterId: 'chapter-1',
    pageRange: '11-15',
    taskType: 'inking',
    assignedTo: 'user-2',
    dueDate: daysFromNow(3),
    status: 'in-progress',
    rejectionCount: 0,
  },
  {
    id: 'task-4',
    chapterId: 'chapter-1',
    pageRange: '16-20',
    taskType: 'background',
    assignedTo: 'user-3',
    dueDate: daysAgo(1),
    status: 'overdue',
    rejectionCount: 0,
  },
  {
    id: 'task-5',
    chapterId: 'chapter-3',
    pageRange: '1-8',
    taskType: 'sketch',
    assignedTo: 'user-2',
    dueDate: daysFromNow(2),
    status: 'pending',
    rejectionCount: 0,
  },
]

// Manuscripts
export const mockManuscripts: Manuscript[] = [
  {
    id: 'manuscript-1',
    chapterId: 'chapter-1',
    version: 2,
    fileUrl: '/manuscripts/dragons-destiny-ch7-v2.pdf',
    submittedAt: daysAgo(0.25), // 6 hours ago
    status: 'pending',
    slaDeadline: daysFromNow(1.25), // 30h remaining
    annotations: [],
    feedback: undefined,
  },
  {
    id: 'manuscript-2',
    chapterId: 'chapter-2',
    version: 3,
    fileUrl: '/manuscripts/dragons-destiny-ch6-v3.pdf',
    submittedAt: daysAgo(10),
    status: 'approved',
    slaDeadline: daysAgo(8),
    annotations: [
      { id: 'anno-1', pageNumber: 3, x: 120, y: 340, comment: 'Excellent detail on the dragon scales!', createdAt: daysAgo(9) },
    ],
    feedback: 'Great work! The action sequences are particularly dynamic.',
    reviewedAt: daysAgo(9),
  },
]

// Rankings
export const mockRankings: RankingEntry[] = [
  {
    id: 'rank-1',
    seriesId: 'series-1',
    votePeriod: '2024-W48',
    readerCount: 150000,
    voteCount: 127500,
    score: 85,
    position: 1,
    trend: 'same',
    flagged: false,
  },
  {
    id: 'rank-2',
    seriesId: 'series-4',
    votePeriod: '2024-W48',
    readerCount: 120000,
    voteCount: 86400,
    score: 72,
    position: 2,
    trend: 'up',
    flagged: false,
  },
  {
    id: 'rank-3',
    seriesId: 'series-5',
    votePeriod: '2024-W48',
    readerCount: 80000,
    voteCount: 36000,
    score: 45,
    position: 3,
    trend: 'down',
    flagged: false,
  },
  {
    id: 'rank-4',
    seriesId: 'series-6',
    votePeriod: '2024-W48',
    readerCount: 50000,
    voteCount: 9000,
    score: 18,
    position: 4,
    trend: 'down',
    flagged: true,
  },
  {
    id: 'rank-5',
    seriesId: 'series-2',
    votePeriod: '2024-W48',
    readerCount: 40000,
    voteCount: 6000,
    score: 15,
    position: 5,
    trend: 'down',
    flagged: true,
  },
]

// Decision Sessions
export const mockDecisionSessions: DecisionSession[] = [
  // Open session for Shadow Chronicles (series-2) - auto-triggered for Bottom 20%
  {
    id: 'decision-1',
    seriesId: 'series-2',
    status: 'open',
    votes: [
      { id: 'dv-1', sessionId: 'decision-1', boardMemberId: 'user-5', decision: 'keep', votedAt: daysAgo(1) },
    ],
    createdAt: daysAgo(3),
  },
  // Open session for Spirit Hunter (series-6) - auto-triggered for Bottom 20%
  {
    id: 'decision-4',
    seriesId: 'series-6',
    status: 'open',
    votes: [],
    createdAt: daysAgo(1),
  },
  // Finalized decision - Cancelled (Lost Legends)
  {
    id: 'decision-2',
    seriesId: 'series-3',
    status: 'finalized',
    votes: [
      { id: 'dv-2', sessionId: 'decision-2', boardMemberId: 'user-5', decision: 'cancel', reason: 'Low readership for 3 consecutive months.', votedAt: daysAgo(45) },
      { id: 'dv-3', sessionId: 'decision-2', boardMemberId: 'user-6', decision: 'cancel', reason: 'Numbers are not sustainable.', votedAt: daysAgo(44) },
      { id: 'dv-4', sessionId: 'decision-2', boardMemberId: 'bm-c', decision: 'cancel', reason: 'Agreed with the assessment.', votedAt: daysAgo(44) },
    ],
    createdAt: daysAgo(50),
    finalizedAt: daysAgo(43),
    outcome: 'cancelled',
  },
  // Finalized decision - Publication Type Changed (historical example)
  {
    id: 'decision-3',
    seriesId: 'series-5',
    status: 'finalized',
    votes: [
      { id: 'dv-5', sessionId: 'decision-3', boardMemberId: 'user-5', decision: 'change-publication-type', newPublicationType: 'Monthly', votedAt: daysAgo(90) },
      { id: 'dv-6', sessionId: 'decision-3', boardMemberId: 'user-6', decision: 'change-publication-type', newPublicationType: 'Monthly', votedAt: daysAgo(89) },
      { id: 'dv-7', sessionId: 'decision-3', boardMemberId: 'bm-c', decision: 'keep', votedAt: daysAgo(89) },
    ],
    createdAt: daysAgo(95),
    finalizedAt: daysAgo(88),
    outcome: 'publication-type-changed',
    newPublicationType: 'Monthly',
  },
]

// Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    userId: 'user-1',
    type: 'deadline',
    title: 'Chapter Deadline Approaching',
    message: "Chapter 7 of Dragon's Destiny is due in 10 days.",
    read: false,
    createdAt: daysAgo(0.5),
    link: '/series/series-1/chapters/chapter-1',
  },
  {
    id: 'notif-2',
    userId: 'user-4',
    type: 'sla',
    title: 'Manuscript Pending Review',
    message: 'A manuscript has been waiting for review for 6 hours. 30h remaining on SLA.',
    read: false,
    createdAt: daysAgo(0.25),
    link: '/manuscripts',
  },
  // Notifications for Board Members about decision sessions
  {
    id: 'notif-3',
    userId: 'user-5',
    type: 'vote',
    title: 'Decision Session Open',
    message: '"Shadow Chronicles" is in Bottom 20% and requires your vote. Vote Rate: 15%',
    read: false,
    createdAt: daysAgo(3),
    link: '/decisions/decision-1',
  },
  {
    id: 'notif-4',
    userId: 'user-6',
    type: 'vote',
    title: 'Decision Session Open',
    message: '"Shadow Chronicles" is in Bottom 20% and requires your vote. Vote Rate: 15%',
    read: false,
    createdAt: daysAgo(3),
    link: '/decisions/decision-1',
  },
  {
    id: 'notif-5',
    userId: 'bm-c',
    type: 'vote',
    title: 'Decision Session Open',
    message: '"Shadow Chronicles" is in Bottom 20% and requires your vote. Vote Rate: 15%',
    read: false,
    createdAt: daysAgo(3),
    link: '/decisions/decision-1',
  },
  // Board Member D (bm-d) has conflict of interest for Shadow Chronicles - no notification
  {
    id: 'notif-6',
    userId: 'user-5',
    type: 'vote',
    title: 'Voting Session Open',
    message: 'Your vote is needed on "Cyber Ninja" proposal. 7 days remaining.',
    read: false,
    createdAt: daysAgo(2),
    link: '/proposals/proposal-1',
  },
  {
    id: 'notif-7',
    userId: 'user-2',
    type: 'alert',
    title: 'Task Overdue',
    message: 'Background task for pages 16-20 is overdue!',
    read: true,
    createdAt: daysAgo(1),
    link: '/tasks',
  },
]
