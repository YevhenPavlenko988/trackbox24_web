import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

type Theme = 'light' | 'dark'
const KEY = 'tb24.theme'

const read = (): Theme => {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * The cabinet's light / dark switch, remembered per browser. Only the signed-in app goes dark: the class is put on
 * {@code <html>} (dialogs and menus render there) while the shell is mounted and taken off again on the public pages.
 */
export function ThemeToggle() {
  const { t } = useTranslation()
  const [theme, setTheme] = useState<Theme>(read)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    return () => document.documentElement.classList.remove('dark')
  }, [theme])

  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      // private mode: the switch still works for this visit
    }
  }
  const label = t(theme === 'dark' ? 'theme.light' : 'theme.dark')
  return (
    <Button variant="ghost" size="icon-sm" onClick={flip} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
