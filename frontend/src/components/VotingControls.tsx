import { useI18n } from '../contexts/I18nContext'
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
  const { t } = useI18n()

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
          {allVoted ? ` ${t('room.revealAll')}` : ` ${t('room.revealPartial')}`}
        </button>
      ) : (
        <button
          className="btn-control outlined"
          onClick={onReset}
          disabled={resetLoading}
        >
          {resetLoading ? <LoadingIcon /> : <RefreshIcon />}
          {` ${t('room.reset')}`}
        </button>
      )}
    </div>
  )
}