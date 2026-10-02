import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { StatusPage } from './StatusPage'

export default function Forbidden() {
  return (
    <StatusPage icon={Lock} code="403" title={t('pages.forbidden')} actions={<Button asChild variant="outline"><Link to="/">Go to dashboard</Link></Button>}>
      Your role doesn't include this. If you need it, ask your school administrator to change your role.
    </StatusPage>
  )
}
