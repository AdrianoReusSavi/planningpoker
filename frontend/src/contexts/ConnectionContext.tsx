import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { HubConnectionState, type HubConnection } from '@microsoft/signalr'
import { getConnection, startConnection } from '../services/signalr'

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

interface ConnectionContextValue {
  connection: HubConnection
  connected: boolean
  status: ConnectionStatus
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null)

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const connection = getConnection()
  const started = useRef(false)

  useEffect(() => {
    connection.onreconnecting(() => setStatus('reconnecting'))
    connection.onreconnected(() => setStatus('connected'))
    connection.onclose(() => setStatus('disconnected'))

    if (!started.current) {
      started.current = true
      startConnection()
        .then(() => setStatus('connected'))
        .catch(() => setStatus('disconnected'))
    } else if (connection.state === HubConnectionState.Connected) {
      setStatus('connected')
    }
  }, [connection])

  return (
    <ConnectionContext.Provider value={{ connection, connected: status === 'connected', status }}>
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  const context = useContext(ConnectionContext)
  if (!context) {
    throw new Error('useConnection must be used within a ConnectionProvider')
  }
  return context
}