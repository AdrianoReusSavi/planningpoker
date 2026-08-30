import { useEffect, useState } from 'react'
import { useI18n } from '../contexts/I18nContext'

interface AutoRevealCountdownProps {
  active: boolean
  seconds: number
}

export default function AutoRevealCountdown({ active, seconds }: AutoRevealCountdownProps) {
  const { t } = useI18n()
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (!active) return

    setLeft(seconds)
    const id = window.setInterval(() => setLeft((value) => (value > 1 ? value - 1 : value)), 1000)
    return () => window.clearInterval(id)
  }, [active, seconds])

  if (!active) return null

  return (
    <div className="auto-reveal-countdown" role="status">
      {t('room.revealingIn', { seconds: String(left) })}
    </div>
  )
}