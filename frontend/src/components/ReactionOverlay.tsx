import { useEffect, useRef, useState } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { emojiByKey } from '../constants/reactions'
import { findCardAnchor } from '../utils/cardLocator'

interface ReactionEvent {
  reaction: string
  fromPlayerId: string
}

interface ActiveReaction {
  id: number
  emoji: string
  x: number
  y: number
  drift: number
}

const REACTION_DURATION_MS = 2800
const DRIFT_RANGE_PX = 36

export default function ReactionOverlay() {
  const { connection } = useConnection()
  const [reactions, setReactions] = useState<ActiveReaction[]>([])
  const nextIdRef = useRef(0)

  useEffect(() => {
    if (!connection) return

    const handler = (data: ReactionEvent) => {
      const emoji = emojiByKey[data.reaction]
      if (!emoji) return

      const origin = findCardAnchor(data.fromPlayerId, 'top')
      if (!origin) return

      const id = ++nextIdRef.current
      const drift = (Math.random() - 0.5) * DRIFT_RANGE_PX
      setReactions(prev => [...prev, { id, emoji, x: origin.x, y: origin.y, drift }])

      window.setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id))
      }, REACTION_DURATION_MS)
    }

    connection.on('REACTION', handler)
    return () => { connection.off('REACTION', handler) }
  }, [connection])

  return (
    <div className="reaction-overlay" aria-hidden="true">
      {reactions.map(r => (
        <div
          key={r.id}
          className="reaction-bubble"
          style={{
            left: `${r.x}px`,
            top: `${r.y}px`,
            ['--drift' as string]: `${r.drift}px`,
          }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  )
}