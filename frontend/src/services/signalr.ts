import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'

const HUB_URL = import.meta.env.VITE_HUB_URL ?? 'http://localhost:5000/planningHub'

let connection: HubConnection | null = null

export function getConnection(): HubConnection {
  if (!connection) {
    connection = new HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect([0, 1000, 2000, 5000, 10000, 30000])
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