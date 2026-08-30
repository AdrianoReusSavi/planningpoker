import { useEffect, useState } from 'react'
import { useConnection } from '../contexts/ConnectionContext'
import { useRoom } from '../contexts/RoomContext'
import { useRoomActions } from '../hooks/useRoomActions'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../contexts/I18nContext'
import { SunIcon, MoonIcon } from '../components/Icons'
import LocalePicker from '../components/LocalePicker'
import CreateRoom from '../components/CreateRoom'
import EnterRoom from '../components/EnterRoom'
import Room from '../components/Room'
import FlipCard from '../components/FlipCard'

export default function Home() {
  const { snapshot } = useRoom()
  const { connection, connected } = useConnection()
  const { getRoomName } = useRoomActions(connection, connected)
  const { isDark, toggle } = useTheme()
  const { t } = useI18n()
  const [roomId, setRoomId] = useState('')
  const [roomName, setRoomName] = useState<string | null>(null)
  const [roomMissing, setRoomMissing] = useState(false)

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('roomId')
    if (param) setRoomId(param)
  }, [])

  useEffect(() => {
    if (!snapshot) return
    setRoomId(snapshot.id)
    window.history.replaceState({}, '', `${window.location.pathname}?roomId=${encodeURIComponent(snapshot.id)}`)
  }, [snapshot?.id])

  useEffect(() => {
    if (!connected || !roomId || snapshot) return

    let current = true
    getRoomName(roomId)
      .then((name) => {
        if (!current) return
        setRoomName(name)
        setRoomMissing(name === null)
      })
      .catch(() => { /**/ })

    return () => { current = false }
  }, [connected, roomId, snapshot, getRoomName])

  const goToCreate = () => {
    setRoomId('')
    setRoomName(null)
    setRoomMissing(false)
    window.history.replaceState({}, '', window.location.pathname)
  }

  if (snapshot) return <Room />

  return (
    <>
      {roomMissing && (
        <div className="connection-banner error" role="status">
          <span>{t('enter.notFound')}</span>
        </div>
      )}
      <div className="home">
        <div className="home-toolbar">
          <LocalePicker />
          <button className="btn-icon" onClick={toggle} title={isDark ? t('header.lightMode') : t('header.darkMode')}>
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
        <div className="home-left">
          <FlipCard />
        </div>
        <div className="home-right">
          <div className="home-form-wrapper">
            <h1 className="home-title">Planning Poker</h1>
            <p className="home-subtitle">{t('home.subtitle')}</p>
            {roomId ? (
              <EnterRoom
                roomId={roomId}
                roomName={roomName}
                roomMissing={roomMissing}
                onGoToCreate={goToCreate}
              />
            ) : (
              <CreateRoom />
            )}
          </div>
        </div>
      </div>
    </>
  )
}