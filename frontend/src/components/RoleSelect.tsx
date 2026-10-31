import { useI18n } from '../contexts/I18nContext'
import type { TranslationKey } from '../i18n/locales'
import type { PlayerRole } from '../types/room'

const ROLES: PlayerRole[] = ['Dev', 'Qa', 'None']

export const roleKey = (role: PlayerRole): TranslationKey => `role.${role}`

interface RoleSelectProps {
  value: PlayerRole | null
  onChange: (role: PlayerRole) => void
}

export default function RoleSelect({ value, onChange }: RoleSelectProps) {
  const { t } = useI18n()

  return (
    <div className="role-select" role="radiogroup" aria-label={t('role.label')}>
      <div className="role-select-options">
        {ROLES.map(role => (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={value === role}
            className={`role-select-option ${value === role ? 'active' : ''}`}
            onClick={() => onChange(role)}
            title={role === 'None' ? t('role.noneHint') : undefined}
          >
            {t(roleKey(role))}
          </button>
        ))}
      </div>
    </div>
  )
}