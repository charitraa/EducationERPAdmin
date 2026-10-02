import { ServerCrash } from 'lucide-react'
import { useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { StatusPage } from './StatusPage'

/** Route error boundary: a crash in one page doesn't take down the app. */
export default function ServerError({ onRetry }: { onRetry?: () => void }) {
  const error = useRouteError() as Error | undefined
  // A deploy can remove old lazy chunks; a reload fetches the new ones.
  const isStaleChunk = error?.message?.includes('dynamically imported module')
  return (
    <StatusPage
      icon={ServerCrash}
      title={isStaleChunk ? 'A new version is available' : t('pages.serverError')}
      actions={<Button onClick={onRetry ?? (() => window.location.reload())}>{isStaleChunk ? 'Reload' : 'Try again'}</Button>}
    >
      {isStaleChunk ? 'Reload the page to continue.' : 'The page ran into a problem. Try again, and if it keeps happening, tell your administrator.'}
    </StatusPage>
  )
}
