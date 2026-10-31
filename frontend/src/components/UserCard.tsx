import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { CrownIcon, CloseIcon, PaletteIcon, TargetIcon, CardIcon, HourglassIcon } from './Icons'
import { useI18n } from '../contexts/I18nContext'
import { formatHours } from '../utils/hours'
import { roleKey } from './RoleSelect'
import type { PlayerRole } from '../types/room'

interface UserCardProps {
  playerId: string
  username: string
  pointsDone: boolean
  hoursDone: boolean | null
  vote: string
  connected: boolean
  flipped: boolean
  revealed: boolean
  revealDelay: number
  role: PlayerRole | null
  hours: number | null
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
  stars: 'pattern-stars',
  none: 'pattern-none',
}

const STEP_CYCLE_MS = 2400

const clockPhase = (offset: number) => `-${(Date.now() + offset) % STEP_CYCLE_MS}ms`

function StepBadge({ kind, done, title, offset = 0, children }: {
  kind: 'hours' | 'points'
  done: boolean
  title: string
  offset?: number
  children: ReactNode
}) {
  const phase = useMemo(() => clockPhase(offset), [done, offset])

  return (
    <span
      className={`seat-step seat-step-${kind} ${done ? 'done' : ''}`}
      style={{ ['--phase' as string]: phase }}
      title={title}
    >
      {children}
    </span>
  )
}

export default function UserCard({
  playerId, username, pointsDone, hoursDone, vote, connected, flipped, revealed, revealDelay, role, hours,
  style, pattern, patternColor, isOwner,
  canKick, onKick, canTransfer, onTransfer,
  canEditStyle, onEditStyle, canThrow, onThrow,
}: UserCardProps) {
  const { t } = useI18n()
  const patternClass = PATTERN_CLASSES[pattern ?? 'stripes'] ?? 'pattern-stripes'
  const frontStyle: CSSProperties = style ? { background: style } : {}
  if (patternColor) {
    const extra = frontStyle as Record<string, string>
    extra['--pattern-color'] = patternColor
    extra['--pattern-alpha'] = '25%'
  }

  const interactive = canEditStyle || canThrow
  const handleClick = canEditStyle ? onEditStyle : canThrow ? onThrow : undefined
  const ariaLabel = canEditStyle ? t('style.title') : canThrow ? t('throw.title') : undefined
  const titleText = canEditStyle ? t('style.cardHint') : canThrow ? t('throw.title') : undefined

  const ringClasses = [
    pointsDone ? 'points-done' : '',
    (hoursDone ?? pointsDone) ? 'hours-done' : '',
    revealed ? 'revealed' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      data-player-id={playerId}
      className={`user-card ${!connected ? 'disconnected' : ''} ${canEditStyle ? 'editable' : ''} ${canThrow ? 'targetable' : ''}`}
    >
      <div className={`avatar-wrap ${ringClasses}`}>
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
            <div className={`card-front ${patternClass}`} style={frontStyle} />
            <div className="card-back">
              <span className="card-vote">{vote}</span>
            </div>
          </div>
        </div>
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
        {!revealed && hoursDone !== null && (
          <StepBadge kind="hours" done={hoursDone} title={t('card.partHours')}>
            <HourglassIcon size={11} />
          </StepBadge>
        )}
        {!revealed && (
          <StepBadge kind="points" done={pointsDone} title={t('card.partPoints')} offset={STEP_CYCLE_MS / 2}>
            <CardIcon size={12} />
          </StepBadge>
        )}
        {revealed && hoursDone !== null && vote !== '' && (
          <span
            className={`seat-hours ${role ? `role-${role.toLowerCase()}` : ''}`}
            style={{ animationDelay: `${revealDelay}ms` }}
            title={role ? t('hours.label', { role: t(roleKey(role)) }) : undefined}
          >
            {formatHours(hours)}
          </span>
        )}
      </div>
      <span className="user-card-name" title={`${username}${isOwner ? ` ${t('card.ownerSuffix')}` : ''}`}>
        {isOwner && <span className="crown"><CrownIcon /></span>}
        {username}
      </span>
    </div>
  )
}