import { useI18n } from '../contexts/I18nContext'
import { CoffeeIcon } from './Icons'

interface BreakRequestBannerProps {
  count: number
  canClear: boolean
  onClear: () => void
}

export default function BreakRequestBanner({ count, canClear, onClear }: BreakRequestBannerProps) {
  const { t } = useI18n()

  if (count === 0) return null

  const label = count === 1
    ? t('break.countOne')
    : t('break.countMany', { count: String(count) })

  return (
    <div className="break-banner" key={count}>
      <span className="break-banner-label">
        <CoffeeIcon />
        {label}
      </span>
      {canClear && (
        <button className="break-banner-clear" onClick={onClear}>
          {t('break.clear')}
        </button>
      )}
    </div>
  )
}