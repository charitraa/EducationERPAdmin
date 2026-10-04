import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, Copy, GraduationCap } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { FieldDefinition } from '@/features/applications/api/applications.api'
import { toApiError } from '@/shared/api/errors'
import { cn } from '@/lib/utils'
import { publicApi, type Receipt } from '../api/public.api'

export function useOrgCode() {
  return useParams().organizationCode ?? ''
}

/** The school's public forms, campuses and name; also tells whether the code is real. */
export function usePublicForms() {
  const code = useOrgCode()
  return useQuery({ queryKey: ['public', code, 'forms'], queryFn: () => publicApi.forms(code), staleTime: 5 * 60_000, retry: false, retryOnMount: false })
}

/** A plain page frame: the school's name, links to its public pages, no sign-in chrome. */
export function PublicLayout({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const code = useOrgCode()
  const forms = usePublicForms()
  const link = (to: string, label: string, end = false) => (
    <NavLink to={`/public/${code}/${to}`} end={end} className={({ isActive }) => cn('rounded-md px-2.5 py-1.5 text-sm', isActive ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground')}>
      {label}
    </NavLink>
  )
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GraduationCap className="h-4 w-4" aria-hidden />
            </span>
            {forms.data?.organization ?? (forms.isPending ? '…' : code.toUpperCase())}
          </span>
          <nav aria-label="Public pages" className="ml-auto flex flex-wrap gap-1">
            {link('admission', 'Admission', true)}
            {link('careers', 'Careers')}
            {link('application/status', 'Check status')}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-6">{children}</div>
      </main>
    </div>
  )
}

function CopyRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [shown, setShown] = useState(!secret)
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <code className="break-all rounded-md bg-muted px-3 py-2 font-mono text-lg font-semibold">{shown ? value : '•'.repeat(Math.min(24, value.length))}</code>
        {secret && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setShown((s) => !s)}>
            {shown ? 'Hide' : 'Show'}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => {
            void navigator.clipboard?.writeText(value)
            setCopied(true)
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />} {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

/** What a public applicant must keep: shown once, both prominently. */
export function ReceiptCard({ receipt, what }: { receipt: Receipt; what: string }) {
  return (
    <section className="rounded-lg border border-success/30 bg-card p-6">
      <p className="flex items-center gap-2 text-lg font-semibold text-success">
        <Check className="h-5 w-5" aria-hidden /> {what} submitted successfully
      </p>
      <div className="mt-5 grid gap-4">
        <CopyRow label="Application number" value={receipt.number} />
        <CopyRow label="Private status token" value={receipt.token} secret />
      </div>
      <p role="alert" className="mt-5 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning-soft p-3 text-sm font-medium">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Save these details. You will need them to check your application status. The token can’t be shown again.
      </p>
    </section>
  )
}

/** A 404 means the school's address is wrong; anything else (busy, offline) is said as it is. */
export function loadError(err: unknown) {
  const e = toApiError(err)
  return e.status === 404 ? new Error('No school uses this address. Check the link you were given.') : e
}

export type Answers = Record<string, string | boolean>

/** A form's own extra questions. */
export function Questions({ fields, value, onChange, errors = {} }: { fields: FieldDefinition[]; value: Answers; onChange: (v: Answers) => void; errors?: Record<string, string | undefined> }) {
  const set = (name: string, v: string | boolean) => onChange({ ...value, [name]: v })
  return (
    <>
      {fields.map((f) => {
        const v = value[f.name]
        if (f.type === 'boolean')
          return (
            <label key={f.name} className="flex items-center gap-3 text-sm sm:col-span-2">
              <Switch checked={v === true} onCheckedChange={(c) => set(f.name, c)} /> {f.label}
            </label>
          )
        return (
          <FormField key={f.name} label={f.label} required={f.required} error={errors[f.name]} className={f.type === 'textarea' ? 'sm:col-span-2' : undefined}>
            {(p) =>
              f.type === 'textarea' ? (
                <Textarea {...p} rows={3} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} />
              ) : f.type === 'date' ? (
                <DatePicker {...p} value={String(v ?? '')} onChange={(d) => set(f.name, d)} />
              ) : f.type === 'choice' ? (
                <SelectControl {...p} value={String(v ?? '')} onChange={(c) => set(f.name, c)} placeholder="Choose…" options={(f.choices ?? []).map((c) => ({ value: c, label: c }))} />
              ) : (
                <Input {...p} inputMode={f.type === 'number' ? 'decimal' : undefined} value={String(v ?? '')} onChange={(e) => set(f.name, e.target.value)} />
              )
            }
          </FormField>
        )
      })}
    </>
  )
}

export const blankAnswers = (fields: FieldDefinition[], saved: Record<string, unknown> = {}): Answers =>
  Object.fromEntries(fields.map((f) => [f.name, f.type === 'boolean' ? Boolean(saved[f.name]) : saved[f.name] == null ? '' : String(saved[f.name])]))

export const answersPayload = (fields: FieldDefinition[], a: Answers) =>
  Object.fromEntries(fields.filter((f) => a[f.name] !== '' && a[f.name] !== undefined).map((f) => [f.name, f.type === 'number' ? Number(a[f.name]) : a[f.name]]))

export function missingAnswers(fields: FieldDefinition[], a: Answers) {
  return Object.fromEntries(fields.filter((f) => f.required && f.type !== 'boolean' && !String(a[f.name] ?? '').trim()).map((f) => [f.name, 'Required.']))
}

/**
 * The backend nests errors as `{ data: { first_name: [...], extra: { q: [...] } }, contact: { email: [...] } }`.
 * Flatten them to `first_name`, `q`, `contact.email` so they land on the inputs; `data`
 * and `extra` are only containers.
 */
export function nestedErrors(err: unknown): { fields: Record<string, string>; message: string } {
  const e = toApiError(err)
  if (e.status !== 400) return { fields: {}, message: e.message }
  const out: Record<string, string> = {}
  const walk = (v: unknown, path: string[]) => {
    if (Array.isArray(v) && v.every((m) => typeof m === 'string')) out[path.filter((p) => p !== 'data' && p !== 'extra').join('.') || 'form'] = v.join(' ')
    else if (typeof v === 'string') out[path.filter((p) => p !== 'data' && p !== 'extra').join('.') || 'form'] = v
    else if (v && typeof v === 'object') for (const [k, inner] of Object.entries(v)) walk(inner, k === 'non_field_errors' || k === 'detail' ? path : [...path, k])
  }
  walk(e.details, [])
  return { fields: out, message: out.form ?? (Object.keys(out).length ? 'Check the highlighted answers.' : e.message) }
}
