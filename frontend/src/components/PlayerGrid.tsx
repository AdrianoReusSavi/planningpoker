import UserCard from './UserCard'

export interface PlayerView {
  id: string
  username: string
  hasVoted: boolean
  vote: string
  connected: boolean
  style: string | null
  pattern: string | null
  patternColor: string | null
}

interface PlayerGridProps {
  players: PlayerView[]
  ownerId: string
  currentPlayerId: string | null
  isLeader: boolean
  flipped: boolean
  onKick: (playerId: string) => void
  onTransfer: (playerId: string) => void
  onEditStyle: () => void
}

export default function PlayerGrid({ players, ownerId, currentPlayerId, isLeader, flipped, onKick, onTransfer, onEditStyle }: PlayerGridProps) {
  return (
    <div className="user-group">
      {players.map((user, idx) => {
        const isSelf = user.id === currentPlayerId
        return (
          <div key={user.id} className="card-deal" style={{ animationDelay: `${idx * 80}ms` }}>
            <UserCard
              username={user.username}
              hasVoted={user.hasVoted}
              vote={user.vote}
              connected={user.connected}
              flipped={user.hasVoted && flipped}
              revealDelay={flipped ? idx * 150 : 0}
              style={user.style}
              pattern={user.pattern}
              patternColor={user.patternColor}
              isOwner={user.id === ownerId}
              canKick={isLeader && !isSelf}
              onKick={() => onKick(user.id)}
              canTransfer={isLeader && !isSelf && user.connected}
              onTransfer={() => onTransfer(user.id)}
              canEditStyle={isSelf}
              onEditStyle={onEditStyle}
            />
          </div>
        )
      })}
    </div>
  )
}