import type { PlayerView } from './PlayerGrid'

interface VoteSummaryProps {
  flipped: boolean
  players: PlayerView[]
  votingDeck: string[]
}

export default function VoteSummary({ flipped, players, votingDeck }: VoteSummaryProps) {
  const hasVotes = players.some(p => p.vote)

  if (!flipped || !hasVotes) {
    return <div className="vote-summary placeholder" aria-hidden="true" />
  }

  const numericDeck = votingDeck.map(Number).filter(n => !isNaN(n))
  const numericVotes = players.map(p => parseFloat(p.vote)).filter(v => !isNaN(v))
  const textVotes = players.map(p => p.vote).filter(v => v && isNaN(Number(v)))

  if (numericVotes.length > 0 && numericDeck.length > 0) {
    const mean = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length
    const closest = numericDeck.reduce((prev, curr) =>
      Math.abs(curr - mean) < Math.abs(prev - mean) ? curr : prev
    )

    return (
      <div className="vote-summary">
        <span className="vote-summary-main">Média aproximada: {closest}</span>
        <span className="vote-summary-detail">Média exata: {mean.toFixed(2)}</span>
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
            <span className="vote-summary-main">Mais votado: {mostVoted[0]}</span>
            <span className="vote-summary-detail">Valor central: {median}</span>
          </>
        ) : (
          <span className="vote-summary-main">Valor central: {median}</span>
        )}
      </div>
    )
  }

  return <div className="vote-summary placeholder" aria-hidden="true" />
}