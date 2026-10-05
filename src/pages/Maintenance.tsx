import { Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { t, tr } from '@/lib/i18n'
import { StatusPage } from './StatusPage'

export default function Maintenance() {
  return (
    <StatusPage icon={Wrench} title={t('pages.maintenance')} actions={<Button onClick={() => window.location.reload()}>{tr('Try again')}</Button>}>
      {tr("We're making improvements. Please check back in a few minutes.")}
    </StatusPage>
  )
}
