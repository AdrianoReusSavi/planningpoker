import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import UserCard from './UserCard'
import ThrowPopover from './ThrowPopover'
import type { PlayerRole } from '../types/room'

export interface PlayerView {
  id: string
  username: string
  hasVoted: boolean
  vote: string
  connected: boolean
  style: string | null
  pattern: string | null
  patternColor: string | null
  role: PlayerRole
  hasPoints: boolean
  hasHours: boolean
  hours: number | null
}

interface PlayerGridProps {
  players: PlayerView[]
  ownerId: string
  currentPlayerId: string | null
  isLeader: boolean
  flipped: boolean
  hoursEnabled: boolean
  onKick: (playerId: string) => void
  onTransfer: (playerId: string) => void
  onEditStyle: () => void
  onThrow: (targetPlayerId: string, itemKey: string) => void
}

const CIRCULAR_MIN_WIDTH = 520
const DENSE_THRESHOLD = 8

const AVATAR_HEIGHT_RATIO = 0.085
const AVATAR_WIDTH_RATIO = 0.05
const AVATAR_MIN = 32
const AVATAR_MAX = 60
const AVATAR_DENSE_FACTOR = 0.82
const AVATAR_REFERENCE = 44

const NAME_GAP_PX = 30
const NAME_W_BUFFER = 22

const SEAT_TOP_OVERHANG = 12
const SHORT_STAGE_RATIO = 0.6
const NAME_FS_MAX = 13
const NAME_FS_MIN = 10

const CARD_GAP_PX = 48
const CARD_GAP_MIN = 20
const ELLIPSE_B_MIN = 96
const ELLIPSE_A_RATIO_CAP = 2.2
const ELLIPSE_A_HORIZONTAL_PAD = 80
const ELLIPSE_A_WIDTH_RATIO = 0.36
const ELLIPSE_A_MAX = 540
const ELLIPSE_B_MAX = 270

const POPOVER_Z_INDEX = 50

export default function PlayerGrid({
  players, ownerId, currentPlayerId, isLeader, flipped, hoursEnabled,
  onKick, onTransfer, onEditStyle, onThrow,
}: PlayerGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [throwTargetId, setThrowTargetId] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cr = entry.contentRect
        setSize({ width: cr.width, height: cr.height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const orderedPlayers = useMemo(() => {
    if (!currentPlayerId) return players
    const selfIdx = players.findIndex(p => p.id === currentPlayerId)
    if (selfIdx <= 0) return players
    return [players[selfIdx], ...players.slice(0, selfIdx), ...players.slice(selfIdx + 1)]
  }, [players, currentPlayerId])

  const canCircle = orderedPlayers.length > 0 && size.width >= CIRCULAR_MIN_WIDTH
  const isDense = orderedPlayers.length > DENSE_THRESHOLD
  const densityClass = isDense ? 'dense' : ''
  const hasSelf = currentPlayerId !== null && orderedPlayers[0]?.id === currentPlayerId

  const layout = useMemo(() => {
    if (!canCircle) return null
    const total = orderedPlayers.length
    const fitted = Math.min(size.height * AVATAR_HEIGHT_RATIO, size.width * AVATAR_WIDTH_RATIO)
    const flipW = Math.max(AVATAR_MIN, Math.min(fitted, AVATAR_MAX)) * (isDense ? AVATAR_DENSE_FACTOR : 1)
    const flipH = flipW
    const scale = flipW / AVATAR_REFERENCE
    const nameFs = Math.max(NAME_FS_MIN, Math.min(NAME_FS_MAX * scale, NAME_FS_MAX))
    const cardW = flipW + NAME_W_BUFFER
    const cardH = flipH + NAME_GAP_PX
    const gap = Math.max(CARD_GAP_MIN, CARD_GAP_PX * scale)
    const angularStep = 2 * Math.sin(Math.PI / Math.max(total, 2))
    const minB = (cardH + gap) / angularStep
    const minA = (cardW + gap) / angularStep
    const rawA = Math.max(140, Math.min(size.width / 2 - cardW - ELLIPSE_A_HORIZONTAL_PAD, size.width * ELLIPSE_A_WIDTH_RATIO, ELLIPSE_A_MAX))
    const seatHalfH = flipW / 2 + nameFs * 1.5 + SEAT_TOP_OVERHANG
    const maxB = Math.max(0, size.height / 2 - seatHalfH)
    if (maxB < seatHalfH * SHORT_STAGE_RATIO) return null
    const wantedB = Math.max(ELLIPSE_B_MIN, minB, Math.min(size.height / 2 - cardH, ELLIPSE_B_MAX))
    const b = Math.min(wantedB, maxB)
    const a = Math.min(Math.max(rawA, minA), wantedB * ELLIPSE_A_RATIO_CAP)
    const baseAngle = hasSelf ? Math.PI / 2 : -Math.PI / 2
    const angleStep = (hasSelf ? -1 : 1) * (2 * Math.PI) / total
    const positions = orderedPlayers.map((_, idx) => {
      const angle = baseAngle + angleStep * idx
      return { x: Math.cos(angle) * a, y: Math.sin(angle) * b }
    })
    return { positions, a, b, flipW, flipH, nameFs }
  }, [canCircle, orderedPlayers, size, isDense, hasSelf])

  const useCircular = layout !== null

  const groupClassName = [
    'user-group',
    useCircular ? 'circular' : '',
    densityClass,
  ].filter(Boolean).join(' ')

  const groupStyle: CSSProperties | undefined = layout
    ? {
      ['--table-w' as string]: `${layout.a * 2}px`,
      ['--table-h' as string]: `${layout.b * 2}px`,
      ['--card-flip-w' as string]: `${layout.flipW}px`,
      ['--card-flip-h' as string]: `${layout.flipH}px`,
      ['--card-name-fs' as string]: `${layout.nameFs}px`,
    }
    : undefined

  return (
    <div ref={containerRef} className={groupClassName} style={groupStyle}>
      {orderedPlayers.map((user, idx) => {
        const isSelf = user.id === currentPlayerId
        const isPopoverOpen = throwTargetId === user.id
        const baseSlotStyle: CSSProperties = useCircular && layout
          ? { left: `calc(50% + ${layout.positions[idx].x}px)`, top: `calc(50% + ${layout.positions[idx].y}px)` }
          : {}
        const slotStyle: CSSProperties = isPopoverOpen
          ? { ...baseSlotStyle, zIndex: POPOVER_Z_INDEX }
          : baseSlotStyle
        return (
          <div key={user.id} className="player-slot" style={slotStyle}>
            <div className="card-deal" style={{ animationDelay: `${idx * 80}ms` }}>
              <UserCard
                playerId={user.id}
                username={user.username}
                pointsDone={hoursEnabled ? user.hasPoints : user.hasVoted}
                hoursDone={hoursEnabled && user.role !== 'None' ? user.hasHours : null}
                revealed={flipped}
                vote={user.vote}
                connected={user.connected}
                flipped={flipped && user.vote !== ''}
                role={hoursEnabled ? user.role : null}
                hours={user.hours}
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
                canThrow={!isSelf && currentPlayerId !== null && user.connected}
                onThrow={() => setThrowTargetId(user.id)}
              />
            </div>
            {throwTargetId === user.id && (
              <ThrowPopover
                onPick={(itemKey) => onThrow(user.id, itemKey)}
                onClose={() => setThrowTargetId(null)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}