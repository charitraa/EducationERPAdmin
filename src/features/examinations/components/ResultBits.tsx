import { StatusBadge } from '@/components/data-display/StatusBadge'
import { enumLabel } from '@/lib/formatters'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Result, ResultCounts } from '../api/examinations.api'

const TONE: Record<Result['status'], StatusTone> = { pass: 'success', fail: 'danger', withheld: 'warning', incomplete: 'warning', exempt: 'muted' }
const STYLE: Record<Result['status'], string> = { pass: 'completed', fail: 'rejected', withheld: 'suspended', incomplete: 'pending', exempt: 'inactive' }

export function ResultBadge({ status }: { status: Result['status'] }) {
  return <StatusBadge status={STYLE[status]} tone={TONE[status]} label={enumLabel('ResultStatusEnum', status)} />
}

/** `{pass: 30, fail: 2}` → "30 pass, 2 fail" */
export function resultCountsText(counts: ResultCounts) {
  return Object.entries(counts)
    .filter(([, n]) => n)
    .map(([k, n]) => `${n} ${enumLabel('ResultStatusEnum', k).toLowerCase()}`)
    .join(', ')
}
