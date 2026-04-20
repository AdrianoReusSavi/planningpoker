import { useEffect, useRef, useState } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { emojiByKey } from '../constants/reactions'

interface ActiveReaction {
  id: number
  emoji: string
  offsetX: number
}

const REACTION_DURATION_MS = 2800
const SCREEN_SPREAD_RATIO = 0.9
const BUBBLE_HALF_WIDTH_PX = 25

export default function ReactionOverlay() {
  const { connection } = useConnection()
  const [reactions, setReactions] = useState<ActiveReaction[]>([])
  const nextIdRef = useRef(0)

  useEffect(() => {
    if (!connection) return

    const handler = (key: string) => {
      const emoji = emojiByKey[key]
      if (!emoji) return

      const id = ++nextIdRef.current
      const maxOffset = Math.max(0, (window.innerWidth * SCREEN_SPREAD_RATIO) / 2 - BUBBLE_HALF_WIDTH_PX)
      const offsetX = Math.random() * (maxOffset * 2) - maxOffset
      setReactions(prev => [...prev, { id, emoji, offsetX }])

      setTimeout(() => {
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
          style={{ left: `calc(50% + ${r.offsetX}px)` }}
        >
          {r.emoji}
        </div>
      ))}
    </div>
  )
}