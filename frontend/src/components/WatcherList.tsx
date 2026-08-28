import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { useI18n } from '../contexts/I18nContext'
import { useEyesFollowPointer } from '../hooks/useEyesFollowPointer'
import WatcherCharacter from './WatcherCharacter'
import ThrowPopover from './ThrowPopover'
import { CrownIcon } from './Icons'
import type { WatcherSnapshot } from '../types/room'

interface WatcherListProps {
  watchers: WatcherSnapshot[]
  currentPlayerId: string | null
  ownerId: string
  isLeader: boolean
  onThrow: (targetId: string, itemKey: string) => void
  onTransfer: (targetId: string) => void
  onEditSelf: () => void
}

const VISIBLE_ROWS = 6

export default function WatcherList({
  watchers, currentPlayerId, ownerId, isLeader, onThrow, onTransfer, onEditSelf,
}: WatcherListProps) {
  const { t } = useI18n()
  const { connection } = useConnection()
  const [throwTargetId, setThrowTargetId] = useState<string | null>(null)
  const [throwingId, setThrowingId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEyesFollowPointer(listRef)

  useEffect(() => {
    if (!connection) return
    let timer = 0
    const onThrown = (data: { fromPlayerId: string }) => {
      setThrowingId(data.fromPlayerId)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setThrowingId(null), 460)
    }
    connection.on('THROW', onThrown)
    return () => {
      connection.off('THROW', onThrown)
      window.clearTimeout(timer)
    }
  }, [connection])

  if (watchers.length === 0) return null

  const shown = watchers.length <= VISIBLE_ROWS
    ? watchers
    : [
      ...watchers.filter(w => w.id === currentPlayerId),
      ...watchers.filter(w => w.id !== currentPlayerId),
    ].slice(0, VISIBLE_ROWS)
  const hidden = watchers.filter(w => !shown.includes(w))

  return (
    <div className="watcher-list" ref={listRef}>
      <ul>
        {shown.map(w => {
          const isSelf = w.id === currentPlayerId
          const isOwner = w.id === ownerId
          const canThrow = !isSelf && currentPlayerId !== null && w.connected
          const canTransfer = isLeader && !isOwner && w.connected
          return (
            <li key={w.id} className="watcher-row">
              <button
                type="button"
                data-player-id={w.id}
                className={`watcher-chip ${w.connected ? '' : 'offline'} ${isSelf ? 'self' : ''} ${canThrow ? 'targetable' : ''}`}
                style={{ ['--watcher-accent' as string]: w.accent } as CSSProperties}
                title={
                  !w.connected ? t('watch.offline', { name: w.name })
                    : isSelf ? t('watch.customize')
                      : t('throw.title')
                }
                disabled={!isSelf && !canThrow}
                onClick={() => {
                  if (isSelf) {
                    onEditSelf()
                  } else if (canThrow) {
                    setThrowTargetId(id => (id === w.id ? null : w.id))
                  }
                }}
              >
                <span className={`watcher-peek ${throwingId === w.id ? 'throwing' : ''}`} aria-hidden="true">
                  <WatcherCharacter character={w.character} hat={isOwner} />
                </span>
                <span
                  className="watcher-name"
                  title={isOwner ? `${w.name} ${t('card.ownerSuffix')}` : undefined}
                >
                  {w.name}
                </span>
              </button>

              {canTransfer && (
                <button
                  type="button"
                  className="watcher-action transfer"
                  onClick={() => onTransfer(w.id)}
                  title={t('card.transferTo', { name: w.name })}
                >
                  <CrownIcon />
                </button>
              )}

              {throwTargetId === w.id && (
                <ThrowPopover
                  onPick={(itemKey) => onThrow(w.id, itemKey)}
                  onClose={() => setThrowTargetId(null)}
                />
              )}
            </li>
          )
        })}
        {hidden.length > 0 && (
          <li className="watcher-row">
            <span
              className="watcher-chip watcher-more"
              title={hidden.map(w => w.name).join(', ')}
            >
              <span className="watcher-name">{t('watch.more', { count: String(hidden.length) })}</span>
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}