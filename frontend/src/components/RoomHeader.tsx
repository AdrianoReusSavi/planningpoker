import { CopyIcon, LogOutIcon, LoadingIcon, HistoryIcon, ExternalLinkIcon } from './Icons'

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

interface RoomHeaderProps {
  roomName: string
  status: ConnectionStatus
  leaveLoading: boolean
  historyCount: number
  onCopyLink: () => void
  onLeave: () => void
  onOpenHistory: () => void
  onOpenMiniView: () => void
}

const STATUS_CONFIG = {
  connecting: { className: 'tag-warning', label: 'Conectando...' },
  connected: { className: 'tag-success', label: 'Online' },
  reconnecting: { className: 'tag-warning', label: 'Reconectando...' },
  disconnected: { className: 'tag-error', label: 'Desconectado' },
} as const

export default function RoomHeader({ roomName, status, leaveLoading, historyCount, onCopyLink, onLeave, onOpenHistory, onOpenMiniView }: RoomHeaderProps) {
  const statusInfo = STATUS_CONFIG[status]

  return (
    <header className="room-header">
      <div className="room-header-left">
        <h2>{roomName}</h2>
        <span className={`status-tag ${statusInfo.className}`}>{statusInfo.label}</span>
      </div>
      <div className="room-header-right">
        <button className="btn-icon" onClick={onOpenHistory} title="Histórico de rodadas">
          <HistoryIcon />
          {historyCount > 0 && <span className="btn-icon-badge">{historyCount}</span>}
        </button>
        <button className="btn-icon" onClick={onOpenMiniView} title="Abrir painel de votação em popup">
          <ExternalLinkIcon />
        </button>
        <button className="btn-outlined primary" onClick={onCopyLink}>
          <CopyIcon /> Convidar
        </button>
        <button className="btn-outlined danger" onClick={onLeave} disabled={leaveLoading}>
          {leaveLoading ? <LoadingIcon /> : <LogOutIcon />} Sair
        </button>
      </div>
    </header>
  )
}