import { useEffect, useMemo, useState } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { useRoom } from '../contexts/RoomContext'
import { useRoomActions } from '../hooks/useRoomActions'
import { useToast } from '../contexts/ToastContext'
import { getDeckByKey } from '../constants/estimationOptions'
import RoomHeader from './RoomHeader'
import PlayerGrid, { type PlayerView } from './PlayerGrid'
import VotingControls from './VotingControls'
import VotingDeck from './VotingDeck'
import ConfirmModal from './ConfirmModal'

interface ModalState {
  title: string
  message: string
  confirmText: string
  danger?: boolean
  onConfirm: () => void
}

export default function Room() {
  const { connection, connected, status } = useConnection()
  const { snapshot, playerId, isWatching, clearRoom } = useRoom()
  const actions = useRoomActions(connection, connected)
  const { showToast } = useToast()
  const [vote, setVote] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [revealLoading, setRevealLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)

  const roomId = snapshot?.id ?? ''
  const flipped = snapshot?.phase === 'REVEALED'
  const isLeader = snapshot?.ownerId === playerId
  const votingDeck = getDeckByKey(snapshot?.votingDeck ?? '').list

  const players: PlayerView[] = useMemo(() => {
    if (!snapshot) return []
    return snapshot.players.map(p => ({
      id: p.id,
      username: p.name,
      hasVoted: p.hasVoted,
      vote: snapshot.votes[p.id] ?? '',
      connected: p.connected,
    }))
  }, [snapshot])

  const allVoted = players.length > 0 && players.every(u => u.hasVoted)
  const someVoted = players.some(u => u.hasVoted)

  useEffect(() => {
    if (!flipped) setVote('')
  }, [flipped])

  const submitVote = async (value: string) => {
    if (!roomId) return
    setVote(value)
    try {
      await actions.submitVote(roomId, value)
    } catch {
      showToast('Falha ao enviar voto.', 'error')
      setVote('')
    }
  }

  const revealVotes = async () => {
    setRevealLoading(true)
    try {
      await actions.revealVotes(roomId)
    } catch {
      showToast('Falha ao revelar votos.', 'error')
    } finally {
      setRevealLoading(false)
    }
  }

  const resetVotes = async () => {
    setResetLoading(true)
    try {
      await actions.resetVotes(roomId)
    } catch {
      showToast('Falha ao resetar votos.', 'error')
    } finally {
      setResetLoading(false)
    }
  }

  const requestLeave = () => {
    setModal({
      title: 'Sair da sala',
      message: 'Tem certeza que deseja sair? Você será removido da votação.',
      confirmText: 'Sair',
      danger: true,
      onConfirm: async () => {
        setModal(null)
        setLeaveLoading(true)
        try {
          await actions.leaveRoom(roomId)
        } finally {
          clearRoom()
        }
      },
    })
  }

  const requestKick = (targetId: string) => {
    const target = players.find(u => u.id === targetId)
    setModal({
      title: 'Remover participante',
      message: `Tem certeza que deseja remover ${target?.username ?? 'este participante'} da sala?`,
      confirmText: 'Remover',
      danger: true,
      onConfirm: async () => {
        setModal(null)
        try {
          await actions.kickPlayer(roomId, targetId)
        } catch {
          showToast('Falha ao remover participante.', 'error')
        }
      },
    })
  }

  const requestTransfer = (targetId: string) => {
    const target = players.find(u => u.id === targetId)
    setModal({
      title: 'Transferir liderança',
      message: `Transferir liderança para ${target?.username ?? 'este participante'}? Você perderá os controles de líder.`,
      confirmText: 'Transferir',
      onConfirm: async () => {
        setModal(null)
        try {
          await actions.transferOwnership(roomId, targetId)
        } catch {
          showToast('Falha ao transferir liderança.', 'error')
        }
      },
    })
  }

  const copyLink = () => {
    const url = `${window.location.origin}?roomId=${encodeURIComponent(roomId)}`
    navigator.clipboard.writeText(url)
    showToast('Link copiado com sucesso!')
  }

  return (
    <div className="room">
      <RoomHeader
        roomName={snapshot?.roomName ?? ''}
        status={status}
        leaveLoading={leaveLoading}
        onCopyLink={copyLink}
        onLeave={requestLeave}
      />

      <PlayerGrid
        players={players}
        ownerId={snapshot?.ownerId ?? ''}
        currentPlayerId={playerId}
        isLeader={isLeader}
        flipped={flipped}
        onKick={requestKick}
        onTransfer={requestTransfer}
      />

      {!isWatching && (
        <>
          <VotingControls
            isLeader={isLeader}
            flipped={flipped}
            allVoted={allVoted}
            someVoted={someVoted}
            revealLoading={revealLoading}
            resetLoading={resetLoading}
            onReveal={revealVotes}
            onReset={resetVotes}
          />
          <VotingDeck
            cards={votingDeck}
            selectedVote={vote}
            onVote={submitVote}
            disabled={flipped}
          />
        </>
      )}

      {modal && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          confirmText={modal.confirmText}
          danger={modal.danger}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}