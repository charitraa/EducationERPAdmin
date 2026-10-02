import { Building2 } from 'lucide-react'
import { useBranches } from '@/app/providers/BranchProvider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { t } from '@/lib/i18n'

const ALL = 'all'

/** Only exists when the organization has two or more branches. */
export function BranchSelector() {
  const { isMultiBranch, branches, selectedBranchId, setSelectedBranchId } = useBranches()
  if (!isMultiBranch) return null

  return (
    <Select value={selectedBranchId ? String(selectedBranchId) : ALL} onValueChange={(v) => setSelectedBranchId(v === ALL ? null : Number(v))}>
      <SelectTrigger className="h-8 w-auto max-w-48 gap-1.5 border-dashed text-sm" aria-label={t('header.branch')}>
        <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL}>{t('header.allBranches')}</SelectItem>
        {branches.map((b) => (
          <SelectItem key={b.id} value={String(b.id)}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
