import { useState, useCallback } from 'react'

export function useSessionStorage(key: string) {
  const [value, setValue] = useState<string | null>(
    () => sessionStorage.getItem(key)
  )

  const set = useCallback((newValue: string | null) => {
    if (newValue === null) {
      sessionStorage.removeItem(key)
    } else {
      sessionStorage.setItem(key, newValue)
    }
    setValue(newValue)
  }, [key])

  return [value, set] as const
}