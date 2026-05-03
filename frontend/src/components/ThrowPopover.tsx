import { useEffect, useRef } from 'react'
import { THROWABLES } from '../constants/throwables'
import { useI18n } from '../contexts/I18nContext'

interface ThrowPopoverProps {
  onPick: (itemKey: string) => void
  onClose: () => void
}

export default function ThrowPopover({ onPick, onClose }: ThrowPopoverProps) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div ref={ref} className="throw-popover" role="menu" aria-label={t('throw.title')}>
      {THROWABLES.map(item => (
        <button
          key={item.key}
          className="throw-item"
          onClick={(e) => { e.stopPropagation(); onPick(item.key) }}
          title={t(item.titleKey)}
          aria-label={t(item.titleKey)}
        >
          {item.display}
        </button>
      ))}
    </div>
  )
}