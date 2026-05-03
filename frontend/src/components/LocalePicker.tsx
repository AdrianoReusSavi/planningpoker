import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../contexts/I18nContext'
import { GlobeIcon } from './Icons'
import type { Locale } from '../i18n/locales'

const LOCALE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'pt-BR', label: 'PT' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
]

export default function LocalePicker() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="locale-picker" ref={ref}>
      <button className="btn-icon" onClick={() => setOpen(!open)} title={t('header.locale')}>
        <GlobeIcon />
      </button>
      {open && (
        <ul className="locale-menu">
          {LOCALE_OPTIONS.map(opt => (
            <li
              key={opt.value}
              className={`locale-option ${opt.value === locale ? 'active' : ''}`}
              onClick={() => { setLocale(opt.value); setOpen(false) }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}