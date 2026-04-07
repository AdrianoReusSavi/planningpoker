import UserCard from './UserCard'

export interface PlayerView {
  id: string
  username: string
  hasVoted: boolean
  vote: string
  connected: boolean
}

interface PlayerGridProps {
  players: PlayerView[]
  ownerId: string
  flipped: boolean
}

const CARD_PALETTE = [
  '#818cf8', '#c084fc', '#f472b6', '#fb923c', '#4ade80',
  '#22d3ee', '#f87171', '#facc15', '#a78bfa', '#34d399',
]

export default function PlayerGrid({ players, ownerId, flipped }: PlayerGridProps) {
  return (
    <div className="user-group">
      {players.map((user, idx) => (
        <div key={user.id} className="card-deal" style={{ animationDelay: `${idx * 80}ms` }}>
          <UserCard
            username={user.username}
            hasVoted={user.hasVoted}
            vote={user.vote}
            connected={user.connected}
            flipped={user.hasVoted && flipped}
            revealDelay={flipped ? idx * 150 : 0}
            color={CARD_PALETTE[idx % CARD_PALETTE.length]}
            isOwner={user.id === ownerId}
          />
        </div>
      ))}
    </div>
  )
}