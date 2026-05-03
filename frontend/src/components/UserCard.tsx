import type { CSSProperties } from 'react'
import { CrownIcon, CloseIcon, PaletteIcon, TargetIcon } from './Icons'
import { useI18n } from '../contexts/I18nContext'

interface UserCardProps {
  playerId: string
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
  canThrow: boolean
  onThrow: () => void
}

const PATTERN_CLASSES: Record<string, string> = {
  stripes: 'pattern-stripes',
  dots: 'pattern-dots',
  grid: 'pattern-grid',
  waves: 'pattern-waves',
  zigzag: 'pattern-zigzag',
  none: 'pattern-none',
}

export default function UserCard({
  playerId, username, hasVoted, vote, connected, flipped, revealDelay,
  style, pattern, patternColor, isOwner,
  canKick, onKick, canTransfer, onTransfer,
  canEditStyle, onEditStyle, canThrow, onThrow,
}: UserCardProps) {
  const { t } = useI18n()
  const patternClass = PATTERN_CLASSES[pattern ?? 'stripes'] ?? 'pattern-stripes'
  const stripeStyle: CSSProperties | undefined = style ? { background: style } : undefined
  const frontStyle: CSSProperties = { ...stripeStyle }
  if (patternColor) {
    const extra = frontStyle as Record<string, string>
    extra['--pattern-color'] = patternColor
    extra['--pattern-alpha'] = '25%'
  }

  const interactive = canEditStyle || canThrow
  const handleClick = canEditStyle ? onEditStyle : canThrow ? onThrow : undefined
  const ariaLabel = canEditStyle ? t('style.title') : canThrow ? t('throw.title') : undefined
  const titleText = canEditStyle ? t('style.cardHint') : canThrow ? t('throw.title') : undefined

  return (
    <div
      data-player-id={playerId}
      className={`user-card ${!connected ? 'disconnected' : ''} ${canEditStyle ? 'editable' : ''} ${canThrow ? 'targetable' : ''}`}
    >
      {canTransfer && (
        <button
          className="user-card-action transfer"
          onClick={(e) => { e.stopPropagation(); onTransfer() }}
          title={t('card.transferTo', { name: username })}
        >
          <CrownIcon />
        </button>
      )}
      {canKick && (
        <button
          className="user-card-action kick"
          onClick={(e) => { e.stopPropagation(); onKick() }}
          title={t('card.kick', { name: username })}
        >
          <CloseIcon />
        </button>
      )}
      {canEditStyle && (
        <span className="user-card-edit-hint" aria-hidden="true">
          <PaletteIcon />
        </span>
      )}
      {canThrow && (
        <span className="user-card-throw-hint" aria-hidden="true">
          <TargetIcon />
        </span>
      )}
      <div
        className="card-flip-container"
        onClick={handleClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={ariaLabel}
        title={titleText}
        onKeyDown={interactive && handleClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick() } } : undefined}
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
      <span className="user-card-name" title={`${username}${isOwner ? ` ${t('card.ownerSuffix')}` : ''}`}>
        {isOwner && <span className="crown"><CrownIcon /></span>}
        {username}
      </span>
    </div>
  )
}