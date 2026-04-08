import { useI18n } from '../contexts/I18nContext'
import { useTheme } from '../contexts/ThemeContext'
import { CopyIcon, LogOutIcon, LoadingIcon, HistoryIcon, ExternalLinkIcon, SunIcon, MoonIcon } from './Icons'
import LocalePicker from './LocalePicker'

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

export default function RoomHeader({ roomName, status, leaveLoading, historyCount, onCopyLink, onLeave, onOpenHistory, onOpenMiniView }: RoomHeaderProps) {
  const { t } = useI18n()
  const { isDark, toggle } = useTheme()

  const statusKey = `status.${status}` as const
  const statusClassName = status === 'connected' ? 'tag-success'
    : status === 'disconnected' ? 'tag-error'
    : 'tag-warning'

  return (
    <header className="room-header">
      <div className="room-header-left">
        <h2>{roomName}</h2>
        <span className={`status-tag ${statusClassName}`}>{t(statusKey)}</span>
      </div>
      <div className="room-header-right">
        <LocalePicker />
        <button className="btn-icon" onClick={toggle} title={isDark ? 'Light mode' : 'Dark mode'}>
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
        <button className="btn-icon" onClick={onOpenHistory} title={t('history.title')}>
          <HistoryIcon />
          {historyCount > 0 && <span className="btn-icon-badge">{historyCount}</span>}
        </button>
        <button className="btn-icon" onClick={onOpenMiniView} title="Mini-view">
          <ExternalLinkIcon />
        </button>
        <button className="btn-outlined primary" onClick={onCopyLink}>
          <CopyIcon /> {t('room.invite')}
        </button>
        <button className="btn-outlined danger" onClick={onLeave} disabled={leaveLoading}>
          {leaveLoading ? <LoadingIcon /> : <LogOutIcon />} {t('room.leave')}
        </button>
      </div>
    </header>
  )
}