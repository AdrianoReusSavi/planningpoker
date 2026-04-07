import { EyeIcon, RefreshIcon, LoadingIcon } from './Icons'

interface VotingControlsProps {
  isLeader: boolean
  flipped: boolean
  allVoted: boolean
  someVoted: boolean
  revealLoading: boolean
  resetLoading: boolean
  onReveal: () => void
  onReset: () => void
}

export default function VotingControls({ isLeader, flipped, allVoted, someVoted, revealLoading, resetLoading, onReveal, onReset }: VotingControlsProps) {
  if (!isLeader) return null

  return (
    <div className="control-buttons">
      {!flipped ? (
        <button
          className={`btn-control ${allVoted ? 'solid' : 'outlined'}`}
          onClick={onReveal}
          disabled={!someVoted || revealLoading}
        >
          {revealLoading ? <LoadingIcon /> : <EyeIcon />}
          {allVoted ? ' Revelar votos' : ' Revelar votos parcial'}
        </button>
      ) : (
        <button
          className="btn-control outlined"
          onClick={onReset}
          disabled={resetLoading}
        >
          {resetLoading ? <LoadingIcon /> : <RefreshIcon />}
          {' '}Resetar votos
        </button>
      )}
    </div>
  )
}