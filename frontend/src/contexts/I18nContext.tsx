import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import locales, { type Locale, type TranslationKey } from '../i18n/locales'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function detectLocale(): Locale {
  const saved = localStorage.getItem('locale')
  if (saved && saved in locales) return saved as Locale
  const lang = navigator.language
  if (lang.startsWith('es')) return 'es'
  if (lang.startsWith('en')) return 'en'
  return 'pt-BR'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem('locale', l)
    setLocaleState(l)
  }, [])

  const t = useCallback((key: TranslationKey, params?: Record<string, string>) => {
    let text: string = locales[locale][key] ?? locales['pt-BR'][key] ?? key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v)
      })
    }
    return text
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}