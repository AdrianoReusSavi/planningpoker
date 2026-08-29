import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { HubConnectionState, type HubConnection } from '@microsoft/signalr'
import { getConnection, nextRetryDelay, startConnection } from '../services/signalr'

type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

const PING_TIMEOUT_MS = 3000

interface ConnectionContextValue {
  connection: HubConnection
  connected: boolean
  status: ConnectionStatus
  retryNow: () => void
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null)

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const connection = getConnection()
  const started = useRef(false)
  const retryTimer = useRef<number | null>(null)
  const failedAttempts = useRef(0)

  const connect = useCallback(() => {
    if (retryTimer.current !== null) {
      window.clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
    if (connection.state !== HubConnectionState.Disconnected) return

    setStatus(failedAttempts.current === 0 ? 'connecting' : 'reconnecting')
    startConnection()
      .then(() => {
        failedAttempts.current = 0
        setStatus('connected')
      })
      .catch(() => {
        setStatus('reconnecting')
        const delay = nextRetryDelay(failedAttempts.current)
        failedAttempts.current += 1
        retryTimer.current = window.setTimeout(connect, delay)
      })
  }, [connection])

  const retryNow = useCallback(async () => {
    failedAttempts.current = 0
    if (connection.state !== HubConnectionState.Disconnected) {
      try {
        await connection.stop()
      } catch {
        return
      }
    }
    connect()
  }, [connection, connect])

  useEffect(() => {
    const swallowPong = () => { /**/ }
    connection.on('Pong', swallowPong)
    return () => connection.off('Pong', swallowPong)
  }, [connection])

  useEffect(() => {
    const onVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return

      if (connection.state !== HubConnectionState.Connected) {
        retryNow()
        return
      }

      const alive = await Promise.race([
        connection.invoke('Ping').then(() => true).catch(() => false),
        new Promise<boolean>((resolve) => window.setTimeout(() => resolve(false), PING_TIMEOUT_MS)),
      ])
      if (!alive) retryNow()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [connection, retryNow])

  useEffect(() => {
    connection.onreconnecting(() => setStatus('reconnecting'))
    connection.onreconnected(() => setStatus('connected'))
    connection.onclose(() => {
      setStatus('reconnecting')
      connect()
    })

    if (!started.current) {
      started.current = true
      connect()
    } else if (connection.state === HubConnectionState.Connected) {
      setStatus('connected')
    }

    return () => {
      if (retryTimer.current !== null) window.clearTimeout(retryTimer.current)
    }
  }, [connection, connect])

  return (
    <ConnectionContext.Provider value={{ connection, connected: status === 'connected', status, retryNow }}>
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