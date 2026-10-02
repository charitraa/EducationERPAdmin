import { Toaster as Sonner } from 'sonner'
import { useTheme } from '@/app/providers/ThemeProvider'
import { useMobile } from '@/hooks/useMobile'

/**
 * Bottom-centre on desktop, clear of header actions (Edit, Publish…) and of the right-aligned sticky Save bars.
 * On phones, top-centre below the header, clear of the bottom navigation.
 */
export function Toaster() {
  const { theme } = useTheme()
  const mobile = useMobile()
  return (
    <Sonner
      theme={theme}
      position={mobile ? 'top-center' : 'bottom-center'}
      offset={mobile ? 64 : 24}
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
