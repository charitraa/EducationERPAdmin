import { useMutation } from '@tanstack/react-query'
import { Search, Undo2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, formatDateTime } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import type { StatusTone } from '@/shared/constants/statuses'
import { publicApi, type PublicForm, type PublicOffer, type PublicStatus, type Receipt } from '../api/public.api'
import { answersPayload, blankAnswers, loadError, missingAnswers, nestedErrors, PublicLayout, Questions, ReceiptCard, useOrgCode, usePublicForms, type Answers } from '../components/PublicParts'

/** The admission form's own fields (the backend's AdmissionData). */
const STUDENT = [
  ['first_name', 'First name', true],
  ['middle_name', 'Middle name', false],
  ['last_name', 'Last name', true],
  ['date_of_birth', 'Date of birth', false],
  ['gender', 'Gender', false],
  ['email', 'Email', false],
  ['phone', 'Phone', false],
  ['applying_for', 'Applying for', false],
  ['previous_school', 'Previous school', false],
  ['address', 'Address', false],
] as const
const GUARDIAN = [
  ['guardian_first_name', 'First name'],
  ['guardian_last_name', 'Last name'],
  ['guardian_relationship', 'Relationship'],
  ['guardian_phone', 'Phone'],
  ['guardian_email', 'Email'],
] as const
const RELATIONSHIPS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
]
const STUDENT_KEYS = [...STUDENT.map(([k]) => k), ...GUARDIAN.map(([k]) => k)]

/** The fields of an admission form, prefilled for a resubmission. */
function AdmissionFields({ form, value, onChange, errors }: { form: PublicForm; value: Answers; onChange: (v: Answers) => void; errors: Record<string, string> }) {
  const set = (k: string, v: string) => onChange({ ...value, [k]: v })
  const field = (k: string, label: string, required = false) => (
    <FormField key={k} label={label} required={required} error={errors[k]} className={k === 'address' ? 'sm:col-span-2' : undefined}>
      {(p) =>
        k === 'date_of_birth' ? (
          <DatePicker {...p} value={String(value[k] ?? '')} onChange={(d) => set(k, d)} />
        ) : k === 'gender' ? (
          <SelectControl {...p} value={String(value[k] ?? '')} onChange={(g) => set(k, g)} allowEmpty options={enumOptions('GenderEnum')} />
        ) : k === 'guardian_relationship' ? (
          <SelectControl {...p} value={String(value[k] ?? '')} onChange={(g) => set(k, g)} allowEmpty options={RELATIONSHIPS} />
        ) : k === 'address' ? (
          <Textarea {...p} rows={2} value={String(value[k] ?? '')} onChange={(e) => set(k, e.target.value)} />
        ) : (
          <Input {...p} inputMode={k.endsWith('phone') ? 'tel' : k.endsWith('email') ? 'email' : undefined} value={String(value[k] ?? '')} onChange={(e) => set(k, e.target.value)} />
        )
      }
    </FormField>
  )
  return (
    <>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">The student</legend>
        {STUDENT.map(([k, label, req]) => field(k, label, req))}
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold">Parent or guardian</legend>
        {GUARDIAN.map(([k, label]) => field(k, label))}
      </fieldset>
      {form.fields.length > 0 && (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">More about you</legend>
          <Questions fields={form.fields} value={value} onChange={onChange} errors={errors} />
        </fieldset>
      )}
    </>
  )
}

function payload(form: PublicForm, a: Answers) {
  const data: Record<string, unknown> = {}
  for (const k of STUDENT_KEYS) if (a[k]) data[k] = a[k]
  data.extra = answersPayload(form.fields, a)
  return data
}

function missing(form: PublicForm, a: Answers) {
  const out: Record<string, string> = missingAnswers(form.fields, a)
  for (const [k, , req] of STUDENT) if (req && !String(a[k] ?? '').trim()) out[k] = 'Required.'
  return out
}

/** The online admission form. No account needed; the applicant keeps a number and a token. */
export function AdmissionPage() {
  const code = useOrgCode()
  const forms = usePublicForms()
  const [formId, setFormId] = useState('')
  const [campus, setCampus] = useState('')
  const [contact, setContact] = useState({ name: '', email: '', phone: '' })
  const [answers, setAnswers] = useState<Answers>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const submit = useMutation({ mutationFn: (input: Parameters<typeof publicApi.submit>[1]) => publicApi.submit(code, input) })

  if (forms.isPending) return <PageLoader />
  if (forms.isError)
    return (
      <PublicLayout title="Apply for admission">
        <ErrorState error={loadError(forms.error)} onRetry={() => void forms.refetch()} />
      </PublicLayout>
    )
  const admissionForms = forms.data.forms.filter((f) => f.kind === 'admission')
  const form = admissionForms.find((f) => String(f.id) === formId) ?? (admissionForms.length === 1 ? admissionForms[0] : undefined)
  const campuses = forms.data.campuses.filter((c) => !form?.campus || c.id === form.campus)
  const chosenCampus = campus || (campuses.length === 1 ? String(campuses[0].id) : '')

  if (receipt)
    return (
      <PublicLayout title="Thank you" description={`Your application to ${forms.data.organization} has been received.`}>
        <ReceiptCard receipt={receipt} what="Application" />
        <p className="mt-4 text-sm">
          <Link to={`/public/${code}/admission/status`} className="font-medium text-primary hover:underline">
            Check its status
          </Link>{' '}
          any time with these two details.
        </p>
      </PublicLayout>
    )

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form) return
    const gaps = missing(form, answers)
    if (!chosenCampus) gaps.campus = 'Choose a branch.'
    if (!contact.name.trim()) gaps['contact.name'] = 'Required.'
    if (!contact.email.trim() && !contact.phone.trim()) gaps['contact.email'] = 'An email or a phone number, so we can reach you.'
    setErrors(gaps)
    setMessage(Object.keys(gaps).length ? 'Fill in the highlighted answers.' : null)
    if (Object.keys(gaps).length) return
    try {
      setReceipt(await submit.mutateAsync({ application_type: form.id, campus: Number(chosenCampus), contact, data: payload(form, answers) }))
      window.scrollTo({ top: 0 })
    } catch (err) {
      const { fields, message: m } = nestedErrors(err)
      setErrors(fields)
      setMessage(m)
    }
  }

  return (
    <PublicLayout title={form?.name ?? 'Apply for admission'} description={form?.description || `Apply to ${forms.data.organization}. It takes about five minutes.`}>
      {admissionForms.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">Admissions aren’t open online right now. Please contact the school’s office.</p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="grid gap-6">
          <FormError message={message} />
          <div className="grid gap-4 sm:grid-cols-2">
            {admissionForms.length > 1 && (
              <FormField label="Form" required>
                {(p) => <SelectControl {...p} value={form ? String(form.id) : ''} onChange={(id) => (setFormId(id), setAnswers(blankAnswers(admissionForms.find((f) => String(f.id) === id)?.fields ?? [])))} placeholder="Choose…" options={admissionForms.map((f) => ({ value: String(f.id), label: f.name }))} />}
              </FormField>
            )}
            {campuses.length > 1 && (
              <FormField label="Branch" required error={errors.campus}>
                {(p) => <SelectControl {...p} value={chosenCampus} onChange={setCampus} placeholder="Choose…" options={campuses.map((c) => ({ value: String(c.id), label: c.name }))} />}
              </FormField>
            )}
          </div>
          {form && (
            <>
              <AdmissionFields form={form} value={answers} onChange={setAnswers} errors={errors} />
              <fieldset className="grid gap-4 sm:grid-cols-3">
                <legend className="mb-2 text-sm font-semibold">Who we should contact</legend>
                <FormField label="Name" required error={errors['contact.name']}>
                  <Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" />
                </FormField>
                <FormField label="Email" error={errors['contact.email']}>
                  <Input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} type="email" autoComplete="email" />
                </FormField>
                <FormField label="Phone" error={errors['contact.phone']}>
                  <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} inputMode="tel" autoComplete="tel" />
                </FormField>
              </fieldset>
              {form.steps.length > 0 && <p className="text-xs text-muted-foreground">What happens next: {form.steps.join(' → ')}. You can check progress with the number and token you get when you send this.</p>}
              <div>
                <Button type="submit" className="h-10" disabled={submit.isPending}>
                  {submit.isPending ? 'Sending…' : 'Send application'}
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </PublicLayout>
  )
}

const TONE: Record<string, StatusTone> = { in_review: 'warning', returned: 'info', approved: 'success', rejected: 'danger', withdrawn: 'muted' }
const STATUS_LABEL: Record<string, string> = { in_review: 'Being reviewed', returned: 'Sent back to you for changes', approved: 'Approved', rejected: 'Not successful', withdrawn: 'Withdrawn' }

function OfferCard({ offer, onRespond, busy }: { offer: PublicOffer; onRespond: (accept: boolean, note: string) => void; busy: boolean }) {
  const [note, setNote] = useState('')
  return (
    <section className="rounded-lg border border-success/30 bg-card p-5 text-sm">
      <h2 className="text-base font-semibold">Your job offer · {offer.vacancy_title}</h2>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">Starts</dt><dd>{formatDate(offer.start_date)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Contract</dt><dd>{enumLabel('ContractKindEnum', offer.contract_kind)}</dd></div>
        {offer.salary_note && <div><dt className="text-xs text-muted-foreground">Salary</dt><dd>{offer.salary_note}</dd></div>}
        {offer.expires_on && <div><dt className="text-xs text-muted-foreground">Answer by</dt><dd>{formatDate(offer.expires_on)}</dd></div>}
      </dl>
      {offer.terms && <p className="mt-3 whitespace-pre-wrap">{offer.terms}</p>}
      {offer.status === 'made' ? (
        <div className="mt-4 grid gap-3">
          <FormField label="Message (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} />
          </FormField>
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => onRespond(true, note)}>Accept the offer</Button>
            <Button variant="outline" disabled={busy} onClick={() => onRespond(false, note)}>Decline</Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 font-medium">{offer.status === 'accepted' ? 'You accepted this offer.' : offer.status === 'declined' ? 'You declined this offer.' : 'This offer was withdrawn.'}</p>
      )}
    </section>
  )
}

/** Check an application with its number and token; withdraw, resubmit, or answer a job offer. */
export function StatusCheckPage() {
  const code = useOrgCode()
  const [params] = useSearchParams()
  const forms = usePublicForms()
  const [lookup, setLookup] = useState({ number: params.get('number') ?? '', token: '' })
  const [status, setStatus] = useState<PublicStatus | null>(null)
  const [offer, setOffer] = useState<PublicOffer | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [editing, setEditing] = useState<Answers | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const check = useMutation({ mutationFn: () => publicApi.status(code, lookup) })
  const act = useMutation({ mutationFn: (fn: () => Promise<PublicStatus>) => fn() })
  const respond = useMutation({ mutationFn: (input: { accept: boolean; note: string }) => publicApi.respond(code, { ...lookup, ...input }) })
  const form = forms.data?.forms.find((f) => f.name === status?.type_name && f.kind === 'admission')

  const onCheck = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setEditing(null)
    try {
      const s = await check.mutateAsync()
      setStatus(s)
      // A job application may carry an offer; most applications don't.
      setOffer(await publicApi.offer(code, lookup).catch(() => null))
    } catch (err) {
      setStatus(null)
      setMessage(nestedErrors(err).message)
    }
  }
  const run = async (fn: () => Promise<PublicStatus>) => {
    try {
      setStatus(await act.mutateAsync(fn))
      setEditing(null)
      setMessage(null)
    } catch (err) {
      const { fields, message: m } = nestedErrors(err)
      setErrors(fields)
      setMessage(m)
    }
  }
  const open = status?.status === 'in_review' || status?.status === 'returned'
  const lastNote = [...(status?.history ?? [])].reverse().find((h) => h.note)?.note

  return (
    <PublicLayout title="Check your application" description="Enter the application number and the private token you were given when you applied.">
      <form onSubmit={onCheck} noValidate className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
        <FormField label="Application number" required>
          <Input value={lookup.number} onChange={(e) => setLookup({ ...lookup, number: e.target.value.trim() })} className="font-mono" placeholder="APP-000123" />
        </FormField>
        <FormField label="Private status token" required>
          <Input value={lookup.token} onChange={(e) => setLookup({ ...lookup, token: e.target.value.trim() })} type="password" className="font-mono" autoComplete="off" />
        </FormField>
        <Button type="submit" disabled={!lookup.number || !lookup.token || check.isPending}>
          <Search aria-hidden /> Check
        </Button>
      </form>
      <div className="mt-4">
        <FormError message={message} />
      </div>
      {status && (
        <section className="mt-6 grid gap-5">
          <div className="rounded-lg border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{status.type_name}</h2>
              <span className="font-mono text-sm text-muted-foreground">{status.number}</span>
              <StatusBadge status={status.status} tone={TONE[status.status]} label={STATUS_LABEL[status.status]} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Sent {formatDateTime(status.submitted_at)}{status.decided_at && ` · decided ${formatDateTime(status.decided_at)}`}</p>
            {status.outcome_label && <p className="mt-3 text-sm font-medium">{status.outcome_label}</p>}
            {status.status === 'returned' && lastNote && <p className="mt-3 rounded-md border border-info/25 bg-info-soft p-3 text-sm">What to change: {lastNote}</p>}
            {status.status === 'rejected' && lastNote && <p className="mt-3 rounded-md bg-muted p-3 text-sm">{lastNote}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              {status.status === 'returned' && form && !editing && <Button onClick={() => setEditing({ ...blankAnswers(form.fields, (status.data.extra ?? {}) as Record<string, unknown>), ...Object.fromEntries(STUDENT_KEYS.map((k) => [k, String(status.data[k] ?? '')])) })}>Change and resubmit</Button>}
              {open && (
                <Button variant="outline" disabled={act.isPending} onClick={() => window.confirm('Withdraw this application? This can’t be undone.') && void run(() => publicApi.withdraw(code, lookup))}>
                  <Undo2 aria-hidden /> Withdraw
                </Button>
              )}
            </div>
          </div>
          {editing && form && (
            <form
              noValidate
              className="grid gap-6 rounded-lg border bg-card p-5"
              onSubmit={(e) => {
                e.preventDefault()
                const gaps = missing(form, editing)
                setErrors(gaps)
                if (!Object.keys(gaps).length) void run(() => publicApi.resubmit(code, { ...lookup, data: payload(form, editing) }))
              }}
            >
              <AdmissionFields form={form} value={editing} onChange={setEditing} errors={errors} />
              <div className="flex gap-2">
                <Button type="submit" disabled={act.isPending}>Resubmit</Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </form>
          )}
          {offer && (
            <OfferCard
              offer={offer}
              busy={respond.isPending}
              onRespond={(accept, note) =>
                void respond.mutateAsync({ accept, note }).then(
                  (o) => setOffer(o),
                  (err) => setMessage(nestedErrors(err).message),
                )
              }
            />
          )}
          <div>
            <h3 className="mb-2 text-sm font-semibold">Progress</h3>
            <ol className="grid gap-2 border-l pl-4 text-sm">
              {status.history.map((h, i) => (
                <li key={i}>
                  <span className="font-medium">{enumLabel('ApplicationEventActionEnum', h.action)}</span>
                  {h.step_name && <span className="text-muted-foreground"> · {h.step_name}</span>}
                  <span className="block text-xs text-muted-foreground">{formatDateTime(h.at)}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </PublicLayout>
  )
}
