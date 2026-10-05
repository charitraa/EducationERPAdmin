import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { humanize } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Permission } from '../api/roles.api'
import { tr } from '@/lib/i18n'

/** Module names as staff say them. Anything not listed is humanized. */
const MODULE_LABELS: Record<string, string> = {
  academics: tr('Academics'),
  admissions: tr('Admissions'),
  api_keys: tr('API keys'),
  audit: tr('Audit log'),
  campuses: tr('Branches'),
  communication: tr('Parent–teacher meetings'),
  exams: tr('Examinations'),
  finance: tr('Fees & payments'),
  grades: tr('Grading'),
  hr: tr('HR & leave'),
  organizations: tr('School details'),
  permissions: tr('Permission catalogue'),
  roles: tr('Roles'),
  users: tr('User accounts'),
}

const moduleLabel = (m: string) => MODULE_LABELS[m] ?? tr(humanize(m))

interface PermissionPickerProps {
  catalogue: Permission[]
  value: string[]
  onChange: (codes: string[]) => void
  disabled?: boolean
}

/**
 * Permissions grouped by module with plain-language names; the code is only a
 * small hint. Each module has an all/none toggle.
 */
export function PermissionPicker({ catalogue, value, onChange, disabled }: PermissionPickerProps) {
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())
  const selected = useMemo(() => new Set(value), [value])

  const groups = useMemo(() => {
    const term = filter.trim().toLowerCase()
    const byModule = new Map<string, Permission[]>()
    for (const p of catalogue) {
      if (term && !`${p.name} ${moduleLabel(p.module)} ${p.code}`.toLowerCase().includes(term)) continue
      byModule.set(p.module, [...(byModule.get(p.module) ?? []), p])
    }
    return [...byModule.entries()].sort(([a], [b]) => moduleLabel(a).localeCompare(moduleLabel(b)))
  }, [catalogue, filter])

  const setMany = (codes: string[], on: boolean) => {
    const next = new Set(selected)
    for (const c of codes) {
      if (on) next.add(c)
      else next.delete(c)
    }
    onChange([...next].sort())
  }
  const toggleOpen = (m: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return next
    })

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={tr('Find a permission…')} className="max-w-xs" aria-label={tr('Find a permission')} />
        <span className="text-sm text-muted-foreground">
          {tr('{size} of {count} selected', { size: selected.size, count: catalogue.length })}
        </span>
      </div>
      <ul className="divide-y rounded-md border">
        {groups.map(([module, perms]) => {
          const codes = perms.map((p) => p.code)
          const on = codes.filter((c) => selected.has(c)).length
          const expanded = open.has(module) || filter.trim() !== ''
          const panelId = `perm-${module}`
          return (
            <li key={module}>
              <div className="flex items-center gap-3 px-3 py-2">
                <Checkbox
                  checked={on === 0 ? false : on === codes.length ? true : 'indeterminate'}
                  onCheckedChange={() => setMany(codes, on !== codes.length)}
                  disabled={disabled}
                  aria-label={tr('All {moduleLabel} permissions', { moduleLabel: moduleLabel(module) })}
                />
                <button type="button" onClick={() => toggleOpen(module)} aria-expanded={expanded} aria-controls={panelId} className="flex flex-1 items-center gap-2 text-left text-sm">
                  <span className="font-medium">{moduleLabel(module)}</span>
                  <span className={cn('text-xs', on ? 'text-primary' : 'text-muted-foreground')}>
                    {on}/{codes.length}
                  </span>
                  <ChevronDown className={cn('ml-auto h-4 w-4 text-muted-foreground transition-transform', expanded && 'rotate-180')} aria-hidden />
                </button>
              </div>
              {expanded && (
                <div id={panelId} className="grid gap-2 border-t bg-muted/20 px-3 py-3 pl-10 sm:grid-cols-2">
                  {perms.map((p) => (
                    <label key={p.code} className="flex items-start gap-2 text-sm">
                      <Checkbox checked={selected.has(p.code)} onCheckedChange={(c) => setMany([p.code], c === true)} disabled={disabled} className="mt-0.5" />
                      <span>
                        {p.name}
                        <span className="block font-mono text-[11px] text-muted-foreground">{p.code}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </li>
          )
        })}
        {groups.length === 0 && <li className="p-3 text-sm text-muted-foreground">{tr('No permission matches “{filter}”.', { filter })}</li>}
      </ul>
    </div>
  )
}
