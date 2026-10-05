import type { ReactNode } from 'react'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useEvents } from '@/features/events/hooks/useEvents'
import { useScholarshipOptions } from '@/features/finance/hooks/useFinance'
import { useLeaveTypeOptions } from '@/features/hr/hooks/useHr'
import { useBuildingOptions } from '@/features/hostel/hooks/useHostel'
import { useRoute, useRouteOptions } from '@/features/transport/hooks/useTransport'
import { formatDate } from '@/lib/dates'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { ApplicationKind, FieldDefinition } from '../api/applications.api'
import { tr } from '@/lib/i18n'

type Widget = 'text' | 'textarea' | 'date' | 'boolean' | 'number' | 'choice' | 'leave_type' | 'scholarship' | 'building' | 'route' | 'stop' | 'direction' | 'event'

interface KindField {
  name: string
  label: string
  widget: Widget
  required?: boolean
  choices?: string[]
}

/** What each kind asks for, matching the backend's data serializers (kinds.py). */
export const KIND_FIELDS: Record<ApplicationKind, KindField[]> = {
  general: [
    { name: 'subject', label: tr('Subject'), widget: 'text', required: true },
    { name: 'details', label: tr('Details'), widget: 'textarea' },
  ],
  certificate: [{ name: 'purpose', label: tr('Purpose'), widget: 'text' }],
  leave: [
    { name: 'leave_type', label: tr('Leave type'), widget: 'leave_type', required: true },
    { name: 'start_date', label: tr('From'), widget: 'date', required: true },
    { name: 'end_date', label: tr('To (inclusive)'), widget: 'date', required: true },
    { name: 'half_day', label: tr('Half a day'), widget: 'boolean' },
    { name: 'reason', label: tr('Reason'), widget: 'textarea' },
  ],
  scholarship: [
    { name: 'scholarship', label: tr('Scholarship'), widget: 'scholarship', required: true },
    { name: 'reason', label: tr('Why'), widget: 'textarea' },
  ],
  hostel: [
    { name: 'building', label: tr('Preferred building'), widget: 'building' },
    { name: 'start_date', label: tr('From'), widget: 'date' },
    { name: 'note', label: tr('Note'), widget: 'textarea' },
  ],
  transport: [
    { name: 'route', label: tr('Route'), widget: 'route', required: true },
    { name: 'stop', label: tr('Stop'), widget: 'stop', required: true },
    { name: 'direction', label: tr('Rides'), widget: 'direction' },
    { name: 'start_date', label: tr('From'), widget: 'date' },
  ],
  event: [
    { name: 'event', label: tr('Event'), widget: 'event', required: true },
    { name: 'note', label: tr('Note'), widget: 'textarea' },
  ],
  admission: [
    { name: 'first_name', label: tr('First name'), widget: 'text', required: true },
    { name: 'last_name', label: tr('Last name'), widget: 'text', required: true },
    { name: 'date_of_birth', label: tr('Date of birth'), widget: 'date' },
    { name: 'phone', label: tr('Phone'), widget: 'text' },
    { name: 'email', label: tr('Email'), widget: 'text' },
    { name: 'applying_for', label: tr('Applying for'), widget: 'text' },
    { name: 'previous_school', label: tr('Previous school'), widget: 'text' },
  ],
  job: [],
}

/** Ids picked from a list are sent as numbers. */
const NUMERIC: Widget[] = ['leave_type', 'scholarship', 'building', 'route', 'stop', 'event', 'number']

export type FormData = Record<string, string | boolean>

export function allFields(kind: ApplicationKind, extra: FieldDefinition[]): KindField[] {
  return [...KIND_FIELDS[kind], ...extra.map((f) => ({ name: f.name, label: f.label, widget: f.type as Widget, required: f.required, choices: f.choices }))]
}

/** Blank values for a form, or the saved ones (for a resubmission; extra answers sit under `extra`). */
export function initialData(kind: ApplicationKind, extra: FieldDefinition[], saved: Record<string, unknown> = {}): FormData {
  const answers = { ...saved, ...((saved.extra as Record<string, unknown> | undefined) ?? {}) }
  return Object.fromEntries(
    allFields(kind, extra).map((f) => {
      const v = answers[f.name]
      if (f.widget === 'boolean') return [f.name, Boolean(v)]
      return [f.name, v == null ? (f.widget === 'direction' ? 'both' : '') : String(v)]
    }),
  )
}

/** What's missing, by field name; the server checks the rest. */
export function missing(kind: ApplicationKind, extra: FieldDefinition[], data: FormData): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of allFields(kind, extra)) if (f.required && f.widget !== 'boolean' && !String(data[f.name] ?? '').trim()) out[f.name] = 'Required.'
  return out
}

/** The values as the backend wants them: empty dropped, ids as numbers, the form's own questions under `extra`. */
export function toPayload(kind: ApplicationKind, extra: FieldDefinition[], data: FormData): Record<string, unknown> {
  const convert = (f: KindField) => {
    const v = data[f.name]
    if (v === '' || v === undefined) return undefined
    return typeof v === 'string' && NUMERIC.includes(f.widget) ? Number(v) : v
  }
  const out: Record<string, unknown> = {}
  for (const f of KIND_FIELDS[kind]) if (convert(f) !== undefined) out[f.name] = convert(f)
  const answers: Record<string, unknown> = {}
  for (const f of allFields(kind, extra).slice(KIND_FIELDS[kind].length)) if (convert(f) !== undefined) answers[f.name] = convert(f)
  out.extra = answers
  if (kind === 'leave' && out.half_day) out.end_date = out.start_date
  return out
}

function StopSelect({ route, ...p }: { route: string; id?: string; value: string; onChange: (v: string) => void }) {
  const q = useRoute(route ? Number(route) : null)
  return <SelectControl {...p} disabled={!route} placeholder={route ? tr('Choose…') : tr('Choose a route first')} options={(q.data?.stops ?? []).map((s) => ({ value: String(s.id), label: s.name }))} />
}

/** The inputs for one kind of application, plus the form's own questions. */
export function KindFields({ kind, extra, value, onChange, errors = {} }: { kind: ApplicationKind; extra: FieldDefinition[]; value: FormData; onChange: (v: FormData) => void; errors?: Record<string, string | undefined> }) {
  const leaveTypes = useLeaveTypeOptions()
  const scholarships = useScholarshipOptions()
  const buildings = useBuildingOptions()
  const routes = useRouteOptions()
  const events = useEvents({ ...PICKER_PARAMS, ordering: '-start_at' }, { enabled: kind === 'event' })
  const set = (name: string, v: string | boolean) => onChange({ ...value, [name]: v, ...(name === 'route' ? { stop: '' } : {}) })
  const options: Partial<Record<Widget, Array<{ value: string; label: string }>>> = {
    leave_type: leaveTypes.options,
    scholarship: (scholarships.data ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    building: buildings,
    route: routes.options,
    direction: [
      { value: 'both', label: tr('Both ways') },
      { value: 'pickup', label: tr('Pickup only') },
      { value: 'drop', label: tr('Drop only') },
    ],
    event: (events.data?.results ?? []).filter((e) => !e.is_over).map((e) => ({ value: String(e.id), label: `${e.name} · ${formatDate(e.start_at)}` })),
  }
  const halfDay = kind === 'leave' && value.half_day === true
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {allFields(kind, extra).map((f) => {
        if (halfDay && f.name === 'end_date') return null
        const v = value[f.name]
        let input: (p: { id?: string }) => ReactNode
        switch (f.widget) {
          case 'textarea':
            input = (p) => <Textarea {...p} rows={2} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} />
            break
          case 'date':
            input = (p) => <DatePicker {...p} value={String(v ?? '')} onChange={(d) => set(f.name, d)} />
            break
          case 'boolean':
            return (
              <label key={f.name} className="flex items-center gap-3 text-sm sm:col-span-2">
                <Switch checked={v === true} onCheckedChange={(c) => set(f.name, c)} /> {f.label}
              </label>
            )
          case 'choice':
            input = (p) => <SelectControl {...p} value={String(v ?? '')} onChange={(c) => set(f.name, c)} placeholder={tr('Choose…')} options={(f.choices ?? []).map((c) => ({ value: c, label: c }))} />
            break
          case 'stop':
            input = (p) => <StopSelect {...p} route={String(value.route ?? '')} value={String(v ?? '')} onChange={(c) => set(f.name, c)} />
            break
          case 'text':
          case 'number':
            input = (p) => <Input {...p} inputMode={f.widget === 'number' ? 'decimal' : undefined} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} />
            break
          default:
            input = (p) => <SelectControl {...p} value={String(v ?? '')} onChange={(c) => set(f.name, c)} allowEmpty={!f.required} placeholder={tr('Choose…')} options={options[f.widget] ?? []} />
        }
        return (
          <FormField key={f.name} label={f.label} required={f.required} error={errors[f.name]} className={f.widget === 'textarea' ? 'sm:col-span-2' : undefined}>
            {input}
          </FormField>
        )
      })}
    </div>
  )
}

const LABELS: Record<string, string> = Object.fromEntries(Object.values(KIND_FIELDS).flat().map((f) => [f.name, f.label]))

/** An application's answers, labelled. Ids show as numbers: the outcome names what they became. */
export function DataView({ data, extra = [] }: { data: Record<string, unknown>; extra?: FieldDefinition[] }) {
  const labels = { ...LABELS, ...Object.fromEntries(extra.map((f) => [f.name, f.label])) }
  const { extra: answers, ...rest } = data
  const entries = Object.entries({ ...rest, ...((answers as Record<string, unknown> | undefined) ?? {}) }).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && v.length === 0))
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">{tr('No details given.')}</p>
  const show = (v: unknown) => (typeof v === 'boolean' ? (v ? 'Yes' : 'No') : typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v) : typeof v === 'object' ? JSON.stringify(v) : String(v))
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{labels[k] ?? k.replace(/_/g, ' ')}</dt>
          <dd className="whitespace-pre-wrap break-words">{show(v)}</dd>
        </div>
      ))}
    </dl>
  )
}
