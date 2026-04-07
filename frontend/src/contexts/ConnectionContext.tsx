import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { HubConnectionState, type HubConnection } from '@microsoft/signalr'
import { getConnection, startConnection } from '../services/signalr'

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

interface ConnectionContextValue {
  connection: HubConnection
  status: ConnectionStatus
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null)

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const connection = getConnection()

  useEffect(() => {
    connection.onreconnecting(() => setStatus('reconnecting'))
    connection.onreconnected(() => setStatus('connected'))
    connection.onclose(() => setStatus('disconnected'))

    startConnection()
      .then(() => setStatus('connected'))
      .catch(() => setStatus('disconnected'))

    return () => {
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.stop()
      }
    }
  }, [connection])

  return (
    <ConnectionContext.Provider value={{ connection, status }}>
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