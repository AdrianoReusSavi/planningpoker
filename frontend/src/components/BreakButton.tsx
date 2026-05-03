import { useI18n } from '../contexts/I18nContext'
import { CoffeeIcon } from './Icons'

interface BreakButtonProps {
  active: boolean
  onClick: () => void
}

export default function BreakButton({ active, onClick }: BreakButtonProps) {
  const { t } = useI18n()
  const label = t(active ? 'break.buttonActive' : 'break.button')

  return (
    <button
      className={`btn-break ${active ? 'active' : ''}`}
      onClick={onClick}
      title={label}
    >
      <CoffeeIcon />
      {label}
    </button>
  )
}