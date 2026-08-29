export interface PlayerSnapshot {
  id: string
  name: string
  hasVoted: boolean
  connected: boolean
  style: string | null
  pattern: string | null
  patternColor: string | null
}

export interface WatcherSnapshot {
  id: string
  name: string
  connected: boolean
  accent: string
  character: number
}

export interface RoundVote {
  playerId: string
  name: string
  vote: string
}

export interface RoundRecord {
  round: number
  votes: RoundVote[]
  completedAt: string
}

export type RoomJoinError =
  | 'INVALID_NAME'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ALREADY_IN_ROOM'
  | 'UNKNOWN'

export interface JoinRoomResponse {
  id: string | null
  error: RoomJoinError | null
}

export interface RoomSnapshot {
  id: string
  ownerId: string
  roomName: string
  votingDeck: string
  phase: 'WAITING' | 'VOTING' | 'REVEALED'
  players: PlayerSnapshot[]
  watchers: WatcherSnapshot[]
  votes: Record<string, string>
  history: RoundRecord[]
  breakRequesters: string[]
}