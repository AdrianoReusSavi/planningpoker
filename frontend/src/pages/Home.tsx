import { useEffect, useState } from 'react'
import { useRoom } from '../contexts/RoomContext'
import CreateRoom from '../components/CreateRoom'
import EnterRoom from '../components/EnterRoom'
import Room from '../components/Room'
import FlipCard from '../components/FlipCard'

export default function Home() {
  const { snapshot } = useRoom()
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
      <div className="home-left">
        <FlipCard />
      </div>
      <div className="home-right">
        {roomId ? (
          <EnterRoom roomId={roomId} onGoToCreate={goToCreate} />
        ) : (
          <CreateRoom />
        )}
      </div>
    </div>
  )
}