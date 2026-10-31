export type PlayerRole = 'None' | 'Dev' | 'Qa'

export interface PlayerSnapshot {
  id: string
  name: string
  hasVoted: boolean
  connected: boolean
  style: string | null
  pattern: string | null
  patternColor: string | null
  role: PlayerRole
  hasPoints: boolean
  hasHours: boolean
}

export interface WatcherSnapshot {
  id: string
  name: string
  connected: boolean
  accent: string
  character: number
  role: PlayerRole
}

export interface RoundVote {
  playerId: string
  name: string
  vote: string
  role: PlayerRole
  hours: number | null
}

export interface RoundRecord {
  round: number
  votes: RoundVote[]
  seatedCount: number
  completedAt: string
}

export type RoomJoinError =
  | 'INVALID_NAME'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ALREADY_IN_ROOM'
  | 'NOT_IN_ROOM'
  | 'ROUND_REVEALED'
  | 'UNKNOWN'

export interface RoomPreview {
  name: string
  hoursEnabled: boolean
}

export interface JoinRoomResponse {
  id: string | null
  error: RoomJoinError | null
}

export interface RoomSnapshot {
  id: string
  ownerId: string
  roomName: string
  votingDeck: string
  hoursEnabled: boolean
  phase: 'WAITING' | 'VOTING' | 'REVEALED'
  players: PlayerSnapshot[]
  watchers: WatcherSnapshot[]
  votes: Record<string, string>
  history: RoundRecord[]
  breakRequesters: string[]
  everyoneVoted: boolean
  autoRevealEnabled: boolean
  autoRevealSeconds: number
}