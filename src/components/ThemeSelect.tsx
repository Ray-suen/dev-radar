import { useEffect, useState } from 'react'

const storageKey = 'dev-radar-theme'
type Theme = 'light' | 'dark'
function applyTheme(theme: Theme) {
  const dark = theme === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === 'light') {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  }

  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
    <path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z" />
  </svg>
}

export function ThemeSelect() {
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light')
  useEffect(() => { applyTheme(theme); localStorage.setItem(storageKey, theme) }, [theme])
  const labels = { label: '主題', light: '淺色', dark: '深色' }
  return <div role="group" aria-label={labels.label} className="theme-select">
    {(['light', 'dark'] as const).map((value) => <button key={value} type="button" aria-label={labels[value]} title={labels[value]} aria-pressed={theme === value} onClick={() => setTheme(value)} className="theme-select-button"><ThemeIcon theme={value} /></button>)}
  </div>
}
