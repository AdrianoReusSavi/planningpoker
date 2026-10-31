import { useI18n } from '../contexts/I18nContext'
import { formatHours, hoursOf, meanOf } from '../utils/hours'
import { roleKey } from './RoleSelect'
import type { PlayerRole, RoundRecord } from '../types/room'

const HOUR_ROLES: PlayerRole[] = ['Dev', 'Qa']

interface RoundHistoryProps {
  open: boolean
  onClose: () => void
  history: RoundRecord[]
  hoursEnabled: boolean
}

export default function RoundHistory({ open, onClose, history, hoursEnabled }: RoundHistoryProps) {
  const { t } = useI18n()

  if (!open) return null

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>{t('history.title')}</h3>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-content">
          {history.length === 0 ? (
            <p className="drawer-empty">{t('history.empty')}</p>
          ) : (
            [...history].reverse().map(round => {
              const numericVotes = round.votes.map(v => parseFloat(v.vote)).filter(n => !isNaN(n))
              const mean = numericVotes.length > 0
                ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
                : null

              return (
                <div key={round.round} className="round-card">
                  <div className="round-card-header">
                    <strong>{t('history.round')} {round.round}</strong>
                    <div className="round-means">
                      {mean && <span className="round-mean">{t('history.mean')}: {mean}</span>}
                      {hoursEnabled && HOUR_ROLES.map(role => (
                        <span key={role} className="round-mean">
                          {t(roleKey(role))}: {formatHours(meanOf(hoursOf(round.votes, role)))}
                        </span>
                      ))}
                    </div>
                  </div>
                  <table className="round-table">
                    <thead>
                      <tr>
                        <th>{t('history.player')}</th>
                        {hoursEnabled && <th>{t('history.role')}</th>}
                        <th>{t('history.vote')}</th>
                        {hoursEnabled && <th>{t('history.hours')}</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {round.votes.map(v => (
                        <tr key={v.playerId}>
                          <td>{v.name}</td>
                          {hoursEnabled && <td>{t(roleKey(v.role))}</td>}
                          <td className="round-vote-cell">{v.vote}</td>
                          {hoursEnabled && (
                            <td className="round-vote-cell">{v.role === 'None' ? '' : formatHours(v.hours)}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}