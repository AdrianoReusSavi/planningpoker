import { useI18n } from '../contexts/I18nContext'

interface VoteSummaryProps {
  flipped: boolean
  votes: string[]
  votingDeck: string[]
}

export default function VoteSummary({ flipped, votes, votingDeck }: VoteSummaryProps) {
  const { t } = useI18n()

  if (!flipped || votes.length === 0) {
    return null
  }

  const numericDeck = votingDeck.map(Number).filter(n => !isNaN(n))
  const numericVotes = votes.map(v => parseFloat(v)).filter(v => !isNaN(v))
  const textVotes = votes.filter(v => v && isNaN(Number(v)))

  if (numericVotes.length > 0 && numericDeck.length > 0) {
    const mean = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
    const closest = numericDeck.reduce((prev, curr) =>
      Math.abs(curr - mean) < Math.abs(prev - mean) ? curr : prev
    )

    return (
      <div className="vote-summary">
        <span className="vote-summary-main">{t('summary.approxMean')}: {closest}</span>
        <span className="vote-summary-detail">{t('summary.exactMean')}: {mean.toFixed(2)}</span>
      </div>
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

    return (
      <div className="vote-summary">
        {!allTied ? (
          <>
            <span className="vote-summary-main">{t('summary.mostVoted')}: {mostVoted[0]}</span>
            <span className="vote-summary-detail">{t('summary.median')}: {median}</span>
          </>
        ) : (
          <span className="vote-summary-main">{t('summary.median')}: {median}</span>
        )}
      </div>
    )
  }

  return null
}