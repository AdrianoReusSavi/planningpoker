import { REACTIONS } from '../constants/reactions'
import { useI18n } from '../contexts/I18nContext'

interface ReactionBarProps {
  onSend: (key: string) => void
}

export default function ReactionBar({ onSend }: ReactionBarProps) {
  const { t } = useI18n()

  return (
    <div className="reaction-bar">
      {REACTIONS.map(r => (
        <button
          key={r.key}
          className="reaction-btn"
          onClick={() => onSend(r.key)}
          title={t(r.titleKey)}
          aria-label={t(r.titleKey)}
        >
          {r.emoji}
        </button>
      ))}
    </div>
  )
}