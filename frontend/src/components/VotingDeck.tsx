import { useState } from 'react'

interface VotingDeckProps {
  cards: string[]
  selectedVote: string
  onVote: (value: string) => void
  disabled: boolean
}

export default function VotingDeck({ cards, selectedVote, onVote, disabled }: VotingDeckProps) {
  return (
    <div className="voting-deck">
      {cards.map((card) => (
        <ActionCard
          key={card}
          value={card}
          selected={selectedVote === card}
          onSelect={() => onVote(card)}
          disabled={disabled}
        />
      ))}
    </div>
  )
}

function ActionCard({ value, selected, onSelect, disabled }: {
  value: string
  selected: boolean
  onSelect: () => void
  disabled: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      aria-label={`Votar ${value}${selected ? ' (selecionado)' : ''}`}
      onClick={() => !disabled && onSelect()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault()
          onSelect()
        }
      }}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`action-card ${selected ? 'selected' : ''} ${hovered && !disabled ? 'hovered' : ''} ${disabled && !selected ? 'disabled' : ''}`}
    >
      <span className="action-card-corner top-left">{value}</span>
      <span className="action-card-center">{value}</span>
      <span className="action-card-corner bottom-right">{value}</span>
    </div>
  )
}