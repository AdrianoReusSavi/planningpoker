import { useState, useCallback } from 'react'

export function useLocalStorage(key: string) {
  const [value, setValue] = useState<string | null>(
    () => localStorage.getItem(key)
  )

  const set = useCallback((newValue: string | null) => {
    if (newValue === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, newValue)
    }
    setValue(newValue)
  }, [key])

  return [value, set] as const
}