import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useBroadcastChannel } from '../hooks/useBroadcastChannel'

interface ThemeContextValue {
  isDark: boolean
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ isDark: false, toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark')

  const postTheme = useBroadcastChannel('planning-poker-theme', useCallback((data: Record<string, unknown>) => {
    setIsDark(data.isDark as boolean)
  }, []))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    postTheme({ isDark })
  }, [isDark, postTheme])

  const toggle = useCallback(() => setIsDark(prev => !prev), [])

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}