import { Construction } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { navItemFor } from '@/app/navigation'
import { Button } from '@/components/ui/button'
import { t, tr } from '@/lib/i18n'
import { StatusPage } from './StatusPage'

/**
 * Placeholder for modules whose backend exists but whose screens aren't built
 * yet. Routing and permissions are real; no data is faked.
 */
export default function PlannedModulePage() {
  const { pathname } = useLocation()
  const item = navItemFor(pathname)
  return (
    <StatusPage
      icon={Construction}
      title={item ? tr('{t} is coming soon', { t: t(item.label) }) : tr('Coming soon')}
      actions={
        <Button asChild variant="outline">
          <Link to="/">{tr('Back to dashboard')}</Link>
        </Button>
      }
    >
      {tr('These screens are being built. Everything you need from them is already stored safely on the server.')}
    </StatusPage>
  )
}
