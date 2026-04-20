export interface PlayerSnapshot {
  id: string
  name: string
  hasVoted: boolean
  connected: boolean
  style: string | null
  pattern: string | null
  patternColor: string | null
}

export interface RoundRecord {
  round: number
  votes: Record<string, string>
  completedAt: string
}

export interface RoomSnapshot {
  id: string
  ownerId: string
  roomName: string
  votingDeck: string
  phase: 'WAITING' | 'VOTING' | 'REVEALED'
  players: PlayerSnapshot[]
  votes: Record<string, string>
  history: RoundRecord[]
  breakRequesters: string[]
}