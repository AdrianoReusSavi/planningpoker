import { ConnectionProvider } from './contexts/ConnectionContext'
import { RoomProvider } from './contexts/RoomContext'
import { ToastProvider } from './contexts/ToastContext'
import Home from './pages/Home'

export default function App() {
  return (
    <ConnectionProvider>
      <RoomProvider>
        <ToastProvider>
          <Home />
        </ToastProvider>
      </RoomProvider>
    </ConnectionProvider>
  )
}