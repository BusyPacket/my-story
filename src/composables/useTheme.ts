import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'my-story-theme'

function getInitialTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

const theme = ref<Theme>(getInitialTheme())
applyTheme(theme.value)

export function useTheme(): {
  theme: typeof theme
  toggleTheme: () => void
  setTheme: (value: Theme) => void
} {
  function toggleTheme(): void {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function setTheme(value: Theme): void {
    theme.value = value
  }

  watch(
    theme,
    (value) => {
      localStorage.setItem(STORAGE_KEY, value)
      applyTheme(value)
    },
    { flush: 'sync' },
  )

  return { theme, toggleTheme, setTheme }
}
