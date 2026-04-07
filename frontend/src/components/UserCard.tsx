import { CrownIcon } from './Icons'

interface UserCardProps {
  username: string
  hasVoted: boolean
  vote: string
  connected: boolean
  flipped: boolean
  revealDelay: number
  color: string
  isOwner: boolean
}

export default function UserCard({ username, hasVoted, vote, connected, flipped, revealDelay, color, isOwner }: UserCardProps) {
  return (
    <div className={`user-card ${!connected ? 'disconnected' : ''}`}>
      <div className="card-flip-container">
        <div
          className={`card-flip ${flipped ? 'flipped' : ''}`}
          style={{ transitionDelay: `${revealDelay}ms` }}
        >
          <div className="card-front" style={{ backgroundColor: color }}>
            {hasVoted ? (
              <span className="card-check">✓</span>
            ) : (
              <span className="card-waiting" />
            )}
          </div>
          <div className="card-back">
            <div className="card-back-stripe" style={{ backgroundColor: color }} />
            <span className="card-vote">{vote}</span>
          </div>
        </div>
      </div>
      <span className="user-card-name" title={`${username}${isOwner ? ' (líder)' : ''}`}>
        {isOwner && <span className="crown"><CrownIcon /></span>}
        {username}
      </span>
    </div>
  )
}