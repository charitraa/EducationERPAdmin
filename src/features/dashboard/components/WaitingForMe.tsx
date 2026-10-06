import { Inbox, TriangleAlert } from 'lucide-react'
import { t, tr } from '@/lib/i18n'
import { useNeedsAttention, useWaitingForMe } from '../hooks/useDashboard'
import { CountPanel } from './CountPanel'

export function WaitingForMe() {
  const inbox = useWaitingForMe()
  return <CountPanel title={t('dashboard.waitingForMe')} icon={Inbox} {...inbox} empty={t('dashboard.nothingWaiting')} />
}

/** Office-wide upkeep: the library desk, stores, hostel and fleet. Hidden from people who run none of them. */
export function NeedsAttention() {
  const attention = useNeedsAttention()
  if (attention.sources.length === 0) return null
  return <CountPanel title={tr('Needs attention')} icon={TriangleAlert} {...attention} empty={tr('Nothing needs attention.')} hideClear />
}
