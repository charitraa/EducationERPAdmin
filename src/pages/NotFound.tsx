import { MapPinOff } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { StatusPage } from './StatusPage'

export default function NotFound() {
  return (
    <StatusPage icon={MapPinOff} code="404" title={t('pages.notFound')} actions={<Button asChild><Link to="/">Go to dashboard</Link></Button>}>
      The address may be mistyped, or the page has moved.
    </StatusPage>
  )
}
