import { useEffect, useState } from 'react'
import { useRoom } from '../contexts/RoomContext'
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
  const { isDark, toggle } = useTheme()
  const { t } = useI18n()
  const [roomId, setRoomId] = useState('')

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('roomId')
    if (param) setRoomId(param)
  }, [])

  const goToCreate = () => {
    setRoomId('')
    window.history.replaceState({}, '', window.location.pathname)
  }

  if (snapshot) return <Room />

  return (
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
            <EnterRoom roomId={roomId} onGoToCreate={goToCreate} />
          ) : (
            <CreateRoom />
          )}
        </div>
      </div>
    </div>
  )
}