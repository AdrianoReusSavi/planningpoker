import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'
import type { IRetryPolicy, RetryContext } from '@microsoft/signalr'

const RETRY_DELAYS = [0, 2000, 5000, 10000, 20000]
const MAX_RETRY_DELAY = 30000
const SERVER_TIMEOUT = 150000
const KEEP_ALIVE_INTERVAL = 15000

export const nextRetryDelay = (previousRetryCount: number) =>
  RETRY_DELAYS[previousRetryCount] ?? MAX_RETRY_DELAY

export const retryPolicy: IRetryPolicy = {
  nextRetryDelayInMilliseconds: ({ previousRetryCount }: RetryContext) =>
    nextRetryDelay(previousRetryCount),
}

const HUB_URL = import.meta.env.VITE_HUB_URL

if (!HUB_URL) {
  throw new Error('VITE_HUB_URL is not configured. Set it in .env file.')
}

let connection: HubConnection | null = null

export function getConnection(): HubConnection {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect(retryPolicy)
      .withServerTimeout(SERVER_TIMEOUT)
      .withKeepAliveInterval(KEEP_ALIVE_INTERVAL)
      .configureLogging(LogLevel.Warning)
      .build()
  }
  return connection
}

export async function startConnection(): Promise<HubConnection> {
  const conn = getConnection()
  if (conn.state === HubConnectionState.Disconnected) {
    await conn.start()
  }
  return conn
}

export async function stopConnection(): Promise<void> {
  if (connection && connection.state !== HubConnectionState.Disconnected) {
    await connection.stop()
  }
}