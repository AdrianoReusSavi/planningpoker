import { useEffect, useRef, useCallback } from 'react'

export function useBroadcastChannel(
  name: string,
  onMessage?: (data: Record<string, unknown>) => void,
) {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const callbackRef = useRef(onMessage)
  callbackRef.current = onMessage

  useEffect(() => {
    const ch = new BroadcastChannel(name)
    channelRef.current = ch

    const handler = (e: MessageEvent) => callbackRef.current?.(e.data)
    ch.addEventListener('message', handler)

    return () => {
      ch.removeEventListener('message', handler)
      ch.close()
      channelRef.current = null
    }
  }, [name])

  const postMessage = useCallback((data: unknown) => {
    channelRef.current?.postMessage(data)
  }, [])

  return postMessage
}