import { useI18n } from '../contexts/I18nContext'
import { LoadingIcon } from './Icons'

interface ConnectionBannerProps {
  status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected'
}

export default function ConnectionBanner({ status }: ConnectionBannerProps) {
  const { t } = useI18n()

  if (status === 'connected') return null

  const isReconnecting = status === 'reconnecting' || status === 'connecting'
  const className = isReconnecting ? 'connection-banner warning' : 'connection-banner error'
  const message = isReconnecting ? t('banner.reconnecting') : t('banner.disconnected')

  return (
    <div className={className}>
      {isReconnecting && <LoadingIcon />}
      <span>{message}</span>
    </div>
  )
}