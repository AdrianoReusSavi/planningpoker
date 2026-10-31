import { useI18n } from '../contexts/I18nContext'
import { HOURS_STEP, MAX_HOURS, parseHours, stepHours } from '../utils/hours'
import { useEffect, useRef } from 'react'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon } from './Icons'
import { roleKey } from './RoleSelect'
import type { PlayerRole } from '../types/room'

interface HoursInputProps {
  role: PlayerRole
  value: string
  onChange: (value: string) => void
  confirmed: boolean
  onConfirm: () => void
  onEdit: () => void
  pending: boolean
  disabled: boolean
}

export default function HoursInput({ role, value, onChange, confirmed, onConfirm, onEdit, pending, disabled }: HoursInputProps) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const reopenedRef = useRef(false)
  const locked = disabled || confirmed
  const current = parseHours(value)
  const empty = value.trim() === '' || Number(value.trim().replace(',', '.')) === 0
  const invalid = !empty && current === null
  const canConfirm = !locked && current !== null

  const step = (direction: 1 | -1) => onChange(String(stepHours(value, direction)))
  const confirm = () => { if (canConfirm) onConfirm() }
  const edit = () => { reopenedRef.current = true; onEdit() }

  useEffect(() => {
    if (!confirmed && reopenedRef.current) {
      reopenedRef.current = false
      inputRef.current?.select()
    }
  }, [confirmed])

  const stateClass = invalid ? 'invalid' : confirmed ? 'confirmed' : pending ? 'pending' : ''

  return (
    <div className={`hours-input ${stateClass}`}>
      <div className="hours-input-field">
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          min={0}
          max={MAX_HOURS}
          step={HOURS_STEP}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirm() } }}
          disabled={locked}
          aria-label={t('hours.label', { role: t(roleKey(role)) })}
          aria-invalid={invalid}
          title={invalid ? t('hours.invalid') : undefined}
        />
        <span className="hours-input-unit" aria-hidden="true">h</span>
        <div className="hours-input-arrows">
          <button
            type="button"
            onClick={() => step(1)}
            disabled={locked || (current !== null && current >= MAX_HOURS)}
            aria-label={t('hours.increase')}
          >
            <ChevronUpIcon />
          </button>
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={locked || empty}
            aria-label={t('hours.decrease')}
          >
            <ChevronDownIcon />
          </button>
        </div>
      </div>
      <button
        type="button"
        className="hours-input-confirm"
        onClick={confirmed ? edit : confirm}
        disabled={confirmed ? disabled : !canConfirm}
        aria-label={confirmed ? t('hours.edit') : t('hours.confirm')}
        title={confirmed ? t('hours.edit') : current === null ? t('hours.invalid') : t('hours.confirm')}
      >
        <span className="icon-check"><CheckIcon /></span>
        <span className="icon-edit"><PencilIcon size={13} /></span>
      </button>
    </div>
  )
}