import type { CSSProperties } from 'react'
import { CrownIcon, CloseIcon, PaletteIcon } from './Icons'
import { useI18n } from '../contexts/I18nContext'

interface UserCardProps {
  username: string
  hasVoted: boolean
  vote: string
  connected: boolean
  flipped: boolean
  revealDelay: number
  style: string | null
  pattern: string | null
  patternColor: string | null
  isOwner: boolean
  canKick: boolean
  onKick: () => void
  canTransfer: boolean
  onTransfer: () => void
  canEditStyle: boolean
  onEditStyle: () => void
}

const PATTERN_CLASSES: Record<string, string> = {
  stripes: 'pattern-stripes',
  dots: 'pattern-dots',
  grid: 'pattern-grid',
  waves: 'pattern-waves',
  zigzag: 'pattern-zigzag',
  none: 'pattern-none',
}

export default function UserCard({ username, hasVoted, vote, connected, flipped, revealDelay, style, pattern, patternColor, isOwner, canKick, onKick, canTransfer, onTransfer, canEditStyle, onEditStyle }: UserCardProps) {
  const { t } = useI18n()
  const patternClass = PATTERN_CLASSES[pattern ?? 'stripes'] ?? 'pattern-stripes'
  const stripeStyle: CSSProperties | undefined = style ? { background: style } : undefined
  const frontStyle: CSSProperties = { ...stripeStyle }
  if (patternColor) {
    const extra = frontStyle as Record<string, string>
    extra['--pattern-color'] = patternColor
    extra['--pattern-alpha'] = '25%'
  }

  return (
    <div className={`user-card ${!connected ? 'disconnected' : ''} ${canEditStyle ? 'editable' : ''}`}>
      {canTransfer && (
        <button
          className="user-card-action transfer"
          onClick={(e) => { e.stopPropagation(); onTransfer() }}
          title={`Transferir liderança para ${username}`}
        >
          <CrownIcon />
        </button>
      )}
      {canKick && (
        <button
          className="user-card-action kick"
          onClick={(e) => { e.stopPropagation(); onKick() }}
          title={`Remover ${username}`}
        >
          <CloseIcon />
        </button>
      )}
      {canEditStyle && (
        <span className="user-card-edit-hint" aria-hidden="true">
          <PaletteIcon />
        </span>
      )}
      <div
        className="card-flip-container"
        onClick={canEditStyle ? onEditStyle : undefined}
        role={canEditStyle ? 'button' : undefined}
        tabIndex={canEditStyle ? 0 : undefined}
        aria-label={canEditStyle ? t('style.title') : undefined}
        title={canEditStyle ? t('style.cardHint') : undefined}
        onKeyDown={canEditStyle ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEditStyle() } } : undefined}
      >
        <div
          className={`card-flip ${flipped ? 'flipped' : ''}`}
          style={{ transitionDelay: `${revealDelay}ms` }}
        >
          <div className={`card-front ${patternClass}`} style={frontStyle}>
            {hasVoted ? (
              <span className="card-check">✓</span>
            ) : (
              <span className="card-waiting" />
            )}
          </div>
          <div className="card-back">
            <div className="card-back-stripe" style={stripeStyle} />
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