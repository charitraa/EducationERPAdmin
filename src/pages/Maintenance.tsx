import { Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t } from '@/lib/i18n'
import { StatusPage } from './StatusPage'

export default function Maintenance() {
  return (
    <StatusPage icon={Wrench} title={t('pages.maintenance')} actions={<Button onClick={() => window.location.reload()}>Try again</Button>}>
      We're making improvements. Please check back in a few minutes.
    </StatusPage>
  )
}
