import type { RoundRecord } from '../types/room'

interface RoundHistoryProps {
  open: boolean
  onClose: () => void
  history: RoundRecord[]
}

export default function RoundHistory({ open, onClose, history }: RoundHistoryProps) {
  if (!open) return null

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>Histórico de rodadas</h3>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-content">
          {history.length === 0 ? (
            <p className="drawer-empty">Nenhuma rodada finalizada ainda.</p>
          ) : (
            [...history].reverse().map(round => {
              const entries = Object.entries(round.votes)
              const numericVotes = entries.map(([, v]) => parseFloat(v)).filter(n => !isNaN(n))
              const mean = numericVotes.length > 0
                ? (numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length).toFixed(1)
                : null

              return (
                <div key={round.round} className="round-card">
                  <div className="round-card-header">
                    <strong>Rodada {round.round}</strong>
                    {mean && <span className="round-mean">Média: {mean}</span>}
                  </div>
                  <table className="round-table">
                    <thead>
                      <tr>
                        <th>Jogador</th>
                        <th>Voto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.map(([name, vote]) => (
                        <tr key={name}>
                          <td>{name}</td>
                          <td className="round-vote-cell">{vote}</td>
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