import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/app/providers/ThemeProvider'

export function Toaster() {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      position="top-right"
      offset={64}
      closeButton
      toastOptions={{
        classNames: {
          toast: 'group border bg-background text-foreground shadow-lg font-sans',
          description: 'text-muted-foreground',
        },
      }}
    />
  )
}
