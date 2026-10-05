import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useListState } from '@/hooks/usePagination'
import { formatDateTime } from '@/lib/dates'
import { enumLabel, enumOptions, humanize } from '@/lib/formatters'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { StatusTone } from '@/shared/constants/statuses'
import type { ListParams, Schema } from '@/shared/types/api'
import { tr, trc } from '@/lib/i18n'

/** `changes` and `metadata` are bare JSON in the OpenAPI. Changes are `{field: {before, after}}`. */
type AuditLog = Omit<Schema<'AuditLog'>, 'changes' | 'metadata'> & {
  changes: Record<string, { before?: unknown; after?: unknown } | unknown> | null
  metadata: Record<string, unknown> | null
}

const auditApi = createResourceApi<AuditLog>('/audit-logs/')
const auditKeys = createQueryKeys('audit-logs')

const TONE: Record<string, StatusTone> = { create: 'success', update: 'info', delete: 'danger', login_failed: 'warning', permission_change: 'warning', export: 'neutral' }

/** The modules that write to the audit log (their `audit_module`). */
const MODULES = ['academics', 'accounts', 'admissions', 'alumni', 'api_keys', 'applications', 'attendance', 'careers', 'communication', 'events', 'examinations', 'files', 'finance', 'hostel', 'hr', 'inventory', 'library', 'notices', 'organizations', 'parents', 'payroll', 'rbac', 'signup', 'staff', 'students', 'support', 'timetable', 'transport']

const show = (v: unknown) => (v == null || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v))

function Changes({ changes }: { changes: AuditLog['changes'] }) {
  const rows = Object.entries(changes ?? {})
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{tr('No field changes recorded.')}</p>
  return (
    <table className="w-full table-fixed text-xs">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="w-1/4 py-1 font-medium">{tr('Field')}</th>
          <th className="py-1 font-medium">{tr('Before')}</th>
          <th className="py-1 font-medium">{tr('After')}</th>
        </tr>
      </thead>
      <tbody className="divide-y align-top">
        {rows.map(([field, v]) => {
          const pair = v && typeof v === 'object' && ('before' in v || 'after' in v) ? (v as { before?: unknown; after?: unknown }) : { after: v }
          return (
            <tr key={field}>
              <td className="py-1 pr-2 font-mono">{field}</td>
              <td className="break-words py-1 pr-2 text-danger">{show(pair.before)}</td>
              <td className="break-words py-1 text-success">{show(pair.after)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/** Who did what, when, and from where. Read-only. */
export default function AuditLogPage() {
  const list = useListState({ filters: ['action', 'module', 'created_after', 'created_before'] })
  const params: ListParams = list.query
  const query = useQuery({ queryKey: auditKeys.list(params), queryFn: () => auditApi.list(params), placeholderData: keepPreviousData })
  const [open, setOpen] = useState<AuditLog | null>(null)
  const columns: Column<AuditLog>[] = [
    { id: 'at', header: tr('Date'), sortField: 'created_at', className: 'whitespace-nowrap tabular-nums text-xs', cell: (l) => formatDateTime(l.created_at) },
    { id: 'who', header: tr('User'), mobile: 'title', className: 'text-xs', cell: (l) => <span title={l.actor_email}>{l.actor_name || l.actor_email || tr('System')}</span> },
    { id: 'action', header: tr('Action'), sortField: 'action', cell: (l) => <StatusBadge status={l.action} tone={TONE[l.action] ?? 'neutral'} label={enumLabel('AuditLogActionEnum', l.action)} /> },
    { id: 'module', header: tr('Module'), sortField: 'module', className: 'text-xs', cell: (l) => humanize(l.module) },
    { id: 'record', header: trc('noun', 'Record'), className: 'max-w-xs truncate text-xs', cell: (l) => (l.object_repr ? <span title={`${l.object_type} #${l.object_id}`}>{l.object_repr}</span> : l.object_type ? `${l.object_type} #${l.object_id}` : '—') },
    { id: 'ip', header: 'IP', mobile: 'hidden', className: 'font-mono text-xs', cell: (l) => l.ip_address ?? '—' },
    { id: 'details', header: tr('Details'), mobile: 'hidden', className: 'max-w-[16rem] truncate text-xs text-muted-foreground', cell: (l) => Object.keys(l.changes ?? {}).join(', ') || (l.metadata && Object.keys(l.metadata).length ? Object.entries(l.metadata).map(([k, v]) => `${k}: ${show(v)}`).join(', ') : '') },
  ]
  const dateFilter = (name: 'created_after' | 'created_before', label: string, endOfDay: boolean) => {
    const value = list.filters[name]?.slice(0, 10) ?? ''
    return (
      <div className="grid gap-1">
        <Label htmlFor={`audit-${name}`} className="text-xs text-muted-foreground">
          {label}
        </Label>
        <DatePicker id={`audit-${name}`} value={value} onChange={(d) => list.setFilter(name, d ? new Date(`${d}T${endOfDay ? '23:59:59' : '00:00:00'}`).toISOString() : undefined)} />
      </div>
    )
  }
  return (
    <div>
      <PageHeader title={tr('Audit log')} description={tr('Every change, sign-in and permission change, with who made it and from where. Entries can’t be edited.')} />
      <DataTable
        ariaLabel={tr('Audit log')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(l) => l.id}
        searchPlaceholder={tr('Record, email or type…')}
        onRowClick={setOpen}
        toolbar={
          <div className="flex flex-wrap items-end gap-2">
            {dateFilter('created_after', tr('From'), false)}
            {dateFilter('created_before', tr('To'), true)}
          </div>
        }
        filters={[
          { name: 'action', label: tr('Action'), options: enumOptions('AuditLogActionEnum') },
          { name: 'module', label: tr('Module'), options: MODULES.map((m) => ({ value: m, label: humanize(m) })) },
        ]}
        empty={{ title: tr('Nothing logged'), description: tr('Nothing matches these filters.') }}
      />
      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {enumLabel('AuditLogActionEnum', open.action)} · {humanize(open.module)}
                </SheetTitle>
                <SheetDescription>{formatDateTime(open.created_at)}</SheetDescription>
              </SheetHeader>
              <dl className="mt-4 grid gap-2 text-sm">
                {(
                  [
                    [tr('User'), open.actor_name ? `${open.actor_name} (${open.actor_email})` : open.actor_email || 'System'],
                    [trc('noun', 'Record'), open.object_repr || '—'],
                    [tr('Type'), open.object_type ? `${open.object_type} #${open.object_id}` : '—'],
                    [tr('Request'), open.request_method ? `${open.request_method} ${open.request_path}` : '—'],
                    ['IP', open.ip_address ?? '—'],
                    [tr('Browser'), open.user_agent || '—'],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[6rem_1fr] gap-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              <h3 className="mb-2 mt-5 text-sm font-semibold">{tr('Changes')}</h3>
              <Changes changes={open.changes} />
              {open.metadata && Object.keys(open.metadata).length > 0 && (
                <>
                  <h3 className="mb-2 mt-5 text-sm font-semibold">{tr('More')}</h3>
                  <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">{JSON.stringify(open.metadata, null, 2)}</pre>
                </>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
