import { useI18n } from '../contexts/I18nContext'
import { formatHours, hoursOf, meanOf } from '../utils/hours'
import { roleKey } from './RoleSelect'
import type { PlayerRole, RoundVote } from '../types/room'

const HOUR_ROLES: PlayerRole[] = ['Dev', 'Qa']

interface VoteSummaryProps {
  flipped: boolean
  votes: string[]
  votingDeck: string[]
  hoursEnabled?: boolean
  roundVotes?: RoundVote[]
}

export default function VoteSummary({ flipped, votes, votingDeck, hoursEnabled = false, roundVotes = [] }: VoteSummaryProps) {
  const { t } = useI18n()

  if (!flipped || votes.length === 0) {
    return null
  }

  const points = pointsSummary(votes, votingDeck, t)
  const hourLines = hoursEnabled
    ? HOUR_ROLES.map(role => ({ role, mean: meanOf(hoursOf(roundVotes, role)) }))
    : []

  if (!points && hourLines.length === 0) return null

  return (
    <div className="vote-summary">
      {points}
      {hourLines.length > 0 && (
        <div className="vote-summary-hours">
          {hourLines.map(({ role, mean }) => (
            <span key={role} className={`vote-summary-hours-item role-${role.toLowerCase()}`}>
              {t('summary.hours', { role: t(roleKey(role)) })}: <strong>{formatHours(mean)}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function pointsSummary(votes: string[], votingDeck: string[], t: ReturnType<typeof useI18n>['t']) {
  const numericDeck = votingDeck.map(Number).filter(n => !isNaN(n))
  const numericVotes = votes.map(v => parseFloat(v)).filter(v => !isNaN(v))
  const textVotes = votes.filter(v => v && isNaN(Number(v)))

  if (numericVotes.length > 0 && numericDeck.length > 0) {
    const mean = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
    const closest = numericDeck.reduce((prev, curr) =>
      Math.abs(curr - mean) < Math.abs(prev - mean) ? curr : prev
    )

    return (
      <>
        <span className="vote-summary-main">{t('summary.approxMean')}: {closest}</span>
        <span className="vote-summary-detail">{t('summary.exactMean')}: {mean.toFixed(2)}</span>
      </>
    )
  }

  if (textVotes.length > 0) {
    const count: Record<string, number> = {}
    textVotes.forEach(v => count[v] = (count[v] || 0) + 1)
    const entries = Object.entries(count)
    const mostVoted = entries.sort((a, b) => b[1] - a[1])[0]
    const allTied = entries.every(e => e[1] === 1)

    const sorted = [...textVotes].sort((a, b) => votingDeck.indexOf(a) - votingDeck.indexOf(b))
    const median = sorted[Math.floor(sorted.length / 2)]

    return !allTied ? (
      <>
        <span className="vote-summary-main">{t('summary.mostVoted')}: {mostVoted[0]}</span>
        <span className="vote-summary-detail">{t('summary.median')}: {median}</span>
      </>
    ) : (
      <span className="vote-summary-main">{t('summary.median')}: {median}</span>
    )
  }

  return null
}