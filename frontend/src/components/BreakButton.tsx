import { useI18n } from '../contexts/I18nContext'
import { CoffeeIcon } from './Icons'

interface BreakButtonProps {
  active: boolean
  onClick: () => void
  compact?: boolean
}

export default function BreakButton({ active, onClick, compact = false }: BreakButtonProps) {
  const { t } = useI18n()
  const label = t(active ? 'break.buttonActive' : 'break.button')

  return (
    <button
      className={`btn-break ${active ? 'active' : ''} ${compact ? 'compact' : ''}`}
      onClick={onClick}
      title={label}
      aria-label={compact ? label : undefined}
    >
      <CoffeeIcon />
      {!compact && label}
    </button>
  )
}