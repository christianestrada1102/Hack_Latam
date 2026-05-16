import { createContext, useContext, useState } from 'react'
import { t as translate } from './i18n'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('hl-lang') ?? 'es')

  function toggle() {
    const next = lang === 'es' ? 'en' : 'es'
    localStorage.setItem('hl-lang', next)
    setLang(next)
  }

  function t(key) {
    return translate(lang, key)
  }

  return (
    <LanguageContext.Provider value={{ lang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  return useContext(LanguageContext)
}
