import { CheckCircle2, CornerUpLeft, FilePlus2, RotateCcw, Undo2, XCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { useBranches } from '@/app/providers/BranchProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useBeds } from '@/features/hostel/hooks/useHostel'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDateTime, formatRelative } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Application, ApplicationKind, ApplicationRow, FieldDefinition } from '../api/applications.api'
import { DataView, initialData, KindFields, missing, toPayload, type FormData } from '../components/KindFields'
import {
  useApplication,
  useApplications,
  useApplicationTypes,
  useApproveApplication,
  useMyApplications,
  usePendingApplications,
  useRejectApplication,
  useResubmitApplication,
  useSendBackApplication,
  useSubmitApplication,
  useWithdrawApplication,
} from '../hooks/useApplications'
import { tr } from '@/lib/i18n'

const TONE: Record<string, StatusTone> = { in_review: 'warning', returned: 'info', approved: 'success', rejected: 'danger', withdrawn: 'muted' }

export function ApplicationStatus({ a }: { a: Pick<ApplicationRow, 'status' | 'step_name'> }) {
  const label = a.status === 'in_review' && a.step_name ? tr('With {step_name}', { step_name: a.step_name }) : a.status === 'returned' ? tr('Sent back') : enumLabel('ApplicationStatusEnum', a.status)
  return <StatusBadge status={a.status ?? 'in_review'} tone={TONE[a.status ?? 'in_review']} label={label} />
}

function columns(withCampus: boolean): Column<ApplicationRow>[] {
  return [
    { id: 'number', header: tr('No.'), className: 'font-mono text-xs', cell: (a) => a.number },
    { id: 'type', header: tr('Form'), mobile: 'title', cell: (a) => <span className="font-medium">{a.type_name}</span> },
    { id: 'who', header: tr('About'), cell: (a) => a.subject_name || '—' },
    { id: 'campus', header: tr('Branch'), hidden: !withCampus, cell: (a) => a.campus_name },
    { id: 'when', header: tr('Sent'), mobile: 'hidden', className: 'whitespace-nowrap', cell: (a) => <span title={formatDateTime(a.submitted_at)}>{formatRelative(a.submitted_at)}</span> },
    { id: 'status', header: tr('Status'), cell: (a) => <ApplicationStatus a={a} /> },
  ]
}

/** Applications whose current step the signed-in user decides. */
export function PendingApplicationsPage() {
  const navigate = useNavigate()
  const list = useListState()
  const query = usePendingApplications(list.query)
  const { isMultiBranch } = useBranches()
  return (
    <DataTable
      ariaLabel={tr('Waiting for me')}
      columns={columns(isMultiBranch)}
      query={query}
      list={list}
      getRowId={(a) => a.id}
      searchable={false}
      onRowClick={(a) => navigate(`/applications/${a.id}`)}
      empty={{ title: tr('Nothing waiting for you'), description: tr('Applications show here when their current step is one your role decides.') }}
    />
  )
}

/** The office's view: every application at the branches it covers. */
export function AllApplicationsPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['status', 'application_type__kind', 'application_type'] })
  const query = useApplications(list.query)
  const types = useApplicationTypes({ ...PICKER_PARAMS })
  const { isMultiBranch } = useBranches()
  const [applying, setApplying] = useState(false)
  return (
    <>
      <DataTable
        ariaLabel={tr('Applications')}
        columns={columns(isMultiBranch)}
        query={query}
        list={list}
        getRowId={(a) => a.id}
        searchPlaceholder={tr('Number or name…')}
        onRowClick={(a) => navigate(`/applications/${a.id}`)}
        toolbar={
          <Button onClick={() => setApplying(true)}>
            <FilePlus2 aria-hidden /> {tr('New application')}
          </Button>
        }
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('ApplicationStatusEnum') },
          { name: 'application_type__kind', label: tr('Kind'), options: enumOptions('ApplicationKindEnum') },
          { name: 'application_type', label: tr('Form'), options: (types.data?.results ?? []).map((t) => ({ value: String(t.id), label: t.name })) },
        ]}
        empty={{ title: tr('No applications'), description: tr('Requests from students, parents and staff show here as they’re sent.') }}
      />
      <ApplyDialog open={applying} onOpenChange={setApplying} office />
    </>
  )
}

/** What the signed-in user has sent, or that is about them or their children. */
export function MyApplicationsPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['status'] })
  const query = useMyApplications(list.query)
  const [applying, setApplying] = useState(false)
  return (
    <>
      <DataTable
        ariaLabel={tr('My applications')}
        columns={columns(false)}
        query={query}
        list={list}
        getRowId={(a) => a.id}
        searchable={false}
        onRowClick={(a) => navigate(`/applications/${a.id}`)}
        toolbar={
          <Button onClick={() => setApplying(true)}>
            <FilePlus2 aria-hidden /> {tr('Apply')}
          </Button>
        }
        filters={[{ name: 'status', label: tr('Status'), options: enumOptions('ApplicationStatusEnum') }]}
        empty={{ title: tr('You haven’t applied for anything'), description: tr('Certificates, leave, hostel, transport and other requests all start here.') }}
      />
      <ApplyDialog open={applying} onOpenChange={setApplying} />
    </>
  )
}

const SUBJECT: Record<ApplicationKind, 'student' | 'staff' | 'any' | 'none'> = {
  admission: 'none',
  leave: 'staff',
  scholarship: 'student',
  hostel: 'student',
  transport: 'student',
  event: 'student',
  certificate: 'student',
  job: 'none',
  general: 'any',
}

/**
 * Fill in a form. The office (`office`) applies on someone's behalf and picks
 * who it's about; anyone else applies for themselves (or their child, picked
 * by the backend when there's only one).
 */
export function ApplyDialog({ open, onOpenChange, office = false }: { open: boolean; onOpenChange: (o: boolean) => void; office?: boolean }) {
  const navigate = useNavigate()
  const types = useApplicationTypes({ ...PICKER_PARAMS, is_active: true }, { enabled: open })
  const submit = useSubmitApplication()
  const staff = useStaffOptions()
  const { branches, isMultiBranch, selectedBranchId, defaultBranchId } = useBranches()
  const [student, setStudent] = useState<Student | null>(null)
  const [data, setData] = useState<FormData>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const forms = (types.data?.results ?? []).filter((t) => t.kind !== 'job' && t.kind !== 'admission')
  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) {
          setStudent(null)
          setData({})
          setFieldErrors({})
        }
      }}
      title={office ? tr('New application') : tr('Apply')}
      description={office ? tr('On a student’s or staff member’s behalf. It goes through the form’s approval steps like any other.') : undefined}
      wide
      submitLabel={tr('Send')}
      schema={z.object({ type: z.string().min(1, tr('Choose a form.')), staff: z.string(), campus: z.string() })}
      defaultValues={{ type: '', staff: '', campus: String(selectedBranchId ?? defaultBranchId ?? '') }}
      onSubmit={async (v) => {
        const t = forms.find((f) => String(f.id) === v.type)!
        const gaps = missing(t.kind, t.fields, data)
        setFieldErrors(gaps)
        if (Object.keys(gaps).length) throw new Error(tr('Fill in the required answers.'))
        const who = SUBJECT[t.kind]
        const a = await submit.mutateAsync({
          application_type: t.id,
          data: toPayload(t.kind, t.fields, data),
          ...(office && (who === 'student' || who === 'any') && student ? { student: student.id } : {}),
          ...(office && (who === 'staff' || who === 'any') && v.staff ? { staff: Number(v.staff) } : {}),
          ...(who === 'any' && !student && !v.staff ? { campus: Number(v.campus) } : {}),
        })
        toast.success(tr('Sent as {number}.', { number: a.number }))
        navigate(`/applications/${a.id}`)
      }}
    >
      {({ watch, setValue, formState: { errors } }) => {
        const t = forms.find((f) => String(f.id) === watch('type'))
        const who = t ? SUBJECT[t.kind] : null
        return (
          <>
            <FormField label={tr('Form')} required error={errors.type?.message} description={t?.description || (t && tr('Decided by: {map}', { map: t.steps.map((s) => s.name).join(' → ') }))}>
              {(p) => (
                <SelectControl
                  {...p}
                  value={watch('type')}
                  onChange={(id) => {
                    setValue('type', id, { shouldValidate: true })
                    const next = forms.find((f) => String(f.id) === id)
                    setData(next ? initialData(next.kind, next.fields) : {})
                    setFieldErrors({})
                  }}
                  placeholder={forms.length ? tr('Choose…') : tr('No forms set up yet')}
                  options={forms.map((f) => ({ value: String(f.id), label: f.name }))}
                />
              )}
            </FormField>
            {t && office && (who === 'student' || who === 'any') && (
              <FormField label={tr('Student')} required={who === 'student'}>
                {(p) => <StudentPicker {...p} value={student} onChange={setStudent} />}
              </FormField>
            )}
            {t && office && (who === 'staff' || (who === 'any' && !student)) && (
              <FormField label={tr('Staff member')} required={who === 'staff'}>
                {(p) => <SelectControl {...p} value={watch('staff')} onChange={(s) => setValue('staff', s)} allowEmpty={who === 'any'} options={staff.data ?? []} placeholder={tr('Choose…')} />}
              </FormField>
            )}
            {t && who === 'any' && !student && !watch('staff') && isMultiBranch && (
              <FormField label={tr('Branch')}>
                {(p) => <SelectControl {...p} value={watch('campus')} onChange={(c) => setValue('campus', c)} options={branches.map((b) => ({ value: String(b.id), label: b.name }))} />}
              </FormField>
            )}
            {t && <KindFields kind={t.kind} extra={t.fields} value={data} onChange={setData} errors={fieldErrors} />}
          </>
        )
      }}
    </FormDialog>
  )
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const EVENT_TONE: Record<string, string> = { completed: 'bg-success', approved: 'bg-success', rejected: 'bg-danger', returned: 'bg-info', withdrawn: 'bg-muted-foreground' }

function History({ a }: { a: Application }) {
  return (
    <ol className="relative grid gap-4 border-l pl-5 text-sm">
      {(a.events ?? []).map((e, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-card ${EVENT_TONE[e.action] ?? 'bg-primary'}`} aria-hidden />
          <p>
            <span className="font-medium">{enumLabel('ApplicationEventActionEnum', e.action)}</span>
            {e.step_name && <span className="text-muted-foreground"> · {e.step_name}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            {e.by_name || tr('The applicant')} · {formatDateTime(e.at)}
          </p>
          {e.note && <p className="mt-1 rounded-md bg-muted px-2 py-1">{e.note}</p>}
        </li>
      ))}
    </ol>
  )
}

/** The bed field a hostel application's final step must fill. */
function BedSelect({ value, onChange, ...p }: { value: string; onChange: (v: string) => void; id?: string }) {
  const beds = useBeds({ ...PICKER_PARAMS, is_active: true })
  const free = (beds.data?.results ?? []).filter((b) => b.occupant == null)
  return <SelectControl {...p} value={value} onChange={onChange} placeholder={tr('Choose a free bed…')} options={free.map((b) => ({ value: String(b.id), label: tr('{room_label} · bed {label}', { room_label: b.room_label, label: b.label }) }))} />
}

type Acting = 'approve' | 'reject' | 'send_back' | 'withdraw' | 'resubmit' | null

/** One application: what was asked, where it is in the chain, and the decision. */
export function ApplicationDetailPage() {
  const id = Number(useParams().id)
  const app = useApplication(Number.isFinite(id) ? id : null)
  const types = useApplicationTypes({ ...PICKER_PARAMS })
  const approve = useApproveApplication()
  const reject = useRejectApplication()
  const sendBack = useSendBackApplication()
  const withdraw = useWithdrawApplication()
  const resubmit = useResubmitApplication()
  const pending = usePendingApplications({ page_size: 100 })
  const { user } = useAuth()
  const { can } = usePermissions()
  const [acting, setActing] = useState<Acting>(null)
  const [data, setData] = useState<FormData>({})
  if (app.isPending) return <PageLoader />
  if (app.isError) return <ErrorState error={app.error} onRetry={() => void app.refetch()} />
  const a = app.data
  const type = types.data?.results.find((t) => t.id === a.application_type)
  const extra: FieldDefinition[] = type?.fields ?? []
  const kind = a.kind as ApplicationKind
  const open = a.status === 'in_review' || a.status === 'returned'
  const decides = a.status === 'in_review' && (pending.data?.results ?? []).some((p) => p.id === a.id)
  const isApplicant = a.applicant != null && a.applicant === user?.id
  const lastStep = type ? a.step === type.steps.length : false
  const needs = lastStep ? type?.decision_fields ?? [] : []
  const close = (o: boolean) => !o && setActing(null)

  return (
    <div>
      <PageHeader
        backTo="/applications"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {a.type_name} <span className="font-mono text-base text-muted-foreground">{a.number}</span> <ApplicationStatus a={a} />
          </span>
        }
        description={tr('{value}{campus_name} · sent {dateTime}', { value: a.subject_name ? tr('About {subject_name}', { subject_name: a.subject_name }) + ' · ' : '', campus_name: a.campus_name, dateTime: formatDateTime(a.submitted_at) })}
        actions={
          <>
            {decides && (
              <>
                <Button onClick={() => setActing('approve')}>
                  <CheckCircle2 aria-hidden /> {lastStep ? tr('Approve') : tr('Approve step')}
                </Button>
                <Button variant="outline" onClick={() => setActing('send_back')}>
                  <CornerUpLeft aria-hidden /> {tr('Send back')}
                </Button>
                <Button variant="outline" onClick={() => setActing('reject')}>
                  <XCircle aria-hidden /> {tr('Reject')}
                </Button>
              </>
            )}
            {a.status === 'returned' && isApplicant && (
              <Button
                onClick={() => {
                  setData(initialData(kind, extra, a.data))
                  setActing('resubmit')
                }}
              >
                <RotateCcw aria-hidden /> {tr('Change and resubmit')}
              </Button>
            )}
            {open && (isApplicant || can(PERMS.applications.manage)) && (
              <Button variant="outline" onClick={() => setActing('withdraw')}>
                <Undo2 aria-hidden /> {tr('Withdraw')}
              </Button>
            )}
          </>
        }
      />
      {a.status === 'returned' && (
        <p className="mb-4 rounded-lg border border-info/25 bg-info-soft p-3 text-sm">
          {tr('Sent back for changes') + ':'} {[...(a.events ?? [])].reverse().find((e) => e.action === 'returned')?.note}
        </p>
      )}
      {a.status === 'approved' && a.outcome_label && (
        <p className="mb-4 rounded-lg border border-success/25 bg-success-soft p-3 text-sm">
          {tr('Done: {outcome_label}', { outcome_label: a.outcome_label })}
          {a.outcome?.type === 'applications.certificate' && (
            <>
              {' '}
              <Link to={`/certificates/${String(a.outcome.id)}`} className="font-medium underline">{tr('View the certificate')}</Link>
            </>
          )}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid content-start gap-4 lg:col-span-2">
          <Section title={tr('Details')}>
            <DataView data={a.data} extra={extra} />
          </Section>
          {(a.contact_name || a.contact_email || a.contact_phone) && (
            <Section title={tr('Contact')}>
              <p className="text-sm">{[a.contact_name, a.contact_email, a.contact_phone].filter(Boolean).join(' · ')}</p>
            </Section>
          )}
        </div>
        <div className="grid content-start gap-4">
          {type && (
            <Section title={tr('Approval steps')}>
              <ol className="grid gap-1.5 text-sm">
                {type.steps.map((s) => {
                  const done = a.status === 'approved' || (s.sequence ?? 0) < a.step!
                  const now = a.status === 'in_review' && s.sequence === a.step
                  return (
                    <li key={s.sequence} className={now ? 'font-medium' : done ? 'text-muted-foreground line-through decoration-muted-foreground/40' : 'text-muted-foreground'}>
                      {s.sequence}. {s.name}
                      {now && <span className="ml-2 text-xs font-normal text-warning">{tr('now')}</span>}
                    </li>
                  )
                })}
              </ol>
            </Section>
          )}
          <Section title={tr('History')}>
            <History a={a} />
          </Section>
        </div>
      </div>

      <FormDialog
        open={acting === 'approve'}
        onOpenChange={close}
        title={lastStep ? tr('Approve this application?') : tr('Approve the {step_name} step?', { step_name: a.step_name ?? 'current' })}
        description={lastStep ? tr('This is the last step: approving carries the request out.') : tr('It moves on to the next step.')}
        submitLabel={tr('Approve')}
        schema={z.object({ note: z.string(), bed: z.string(), employee_number: z.string() }).superRefine((v, ctx) => {
          if (needs.includes('bed') && !v.bed) ctx.addIssue({ code: 'custom', path: ['bed'], message: tr('Choose a bed.') })
          if (needs.includes('employee_number') && !v.employee_number.trim()) ctx.addIssue({ code: 'custom', path: ['employee_number'], message: tr('Required.') })
        })}
        defaultValues={{ note: '', bed: '', employee_number: '' }}
        onSubmit={async (v) => {
          const decision: Record<string, unknown> = {}
          if (needs.includes('bed')) decision.bed = Number(v.bed)
          if (needs.includes('employee_number')) decision.employee_number = v.employee_number.trim()
          await approve.mutateAsync({ id: a.id, note: v.note, decision })
          toast.success(lastStep ? tr('Approved.') : tr('Step approved.'))
        }}
      >
        {({ register, watch, setValue, formState: { errors } }) => (
          <>
            {needs.includes('bed') && (
              <FormField label={tr('Bed')} required error={errors.bed?.message}>
                {(p) => <BedSelect {...p} value={watch('bed')} onChange={(b) => setValue('bed', b, { shouldValidate: true })} />}
              </FormField>
            )}
            {needs.includes('employee_number') && (
              <FormField label={tr('Employee number')} required error={errors.employee_number?.message}>
                <Input {...register('employee_number')} className="font-mono" />
              </FormField>
            )}
            <FormField label={tr('Note')}>
              <Textarea {...register('note')} rows={2} />
            </FormField>
          </>
        )}
      </FormDialog>
      <FormDialog
        open={acting === 'reject' || acting === 'send_back' || acting === 'withdraw'}
        onOpenChange={close}
        title={acting === 'reject' ? tr('Reject this application?') : acting === 'send_back' ? tr('Send back for changes') : tr('Withdraw this application?')}
        description={acting === 'send_back' ? tr('The applicant sees your note, changes their answers and resubmits.') : acting === 'reject' ? tr('The applicant sees your reason.') : undefined}
        submitLabel={acting === 'reject' ? tr('Reject') : acting === 'send_back' ? tr('Send back') : tr('Withdraw')}
        schema={z.object({ note: z.string().trim() }).refine((v) => acting === 'withdraw' || v.note.length > 0, { path: ['note'], message: tr('Say why.') })}
        defaultValues={{ note: '' }}
        onSubmit={async (v) => {
          if (acting === 'reject') await reject.mutateAsync({ id: a.id, note: v.note })
          else if (acting === 'send_back') await sendBack.mutateAsync({ id: a.id, note: v.note })
          else await withdraw.mutateAsync({ id: a.id, note: v.note })
          toast.success(acting === 'reject' ? tr('Rejected.') : acting === 'send_back' ? tr('Sent back.') : tr('Withdrawn.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={acting === 'send_back' ? tr('What to change') : acting === 'reject' ? tr('Reason') : tr('Note')} required={acting !== 'withdraw'} error={errors.note?.message}>
            <Textarea {...register('note')} rows={3} />
          </FormField>
        )}
      </FormDialog>
      <FormDialog
        open={acting === 'resubmit'}
        onOpenChange={close}
        title={tr('Change and resubmit')}
        wide
        submitLabel={tr('Resubmit')}
        schema={z.object({ note: z.string() })}
        defaultValues={{ note: '' }}
        onSubmit={async (v) => {
          if (Object.keys(missing(kind, extra, data)).length) throw new Error(tr('Fill in the required answers.'))
          await resubmit.mutateAsync({ id: a.id, data: toPayload(kind, extra, data), note: v.note })
          toast.success(tr('Resubmitted.'))
        }}
      >
        {({ register }) => (
          <>
            <KindFields kind={kind} extra={extra} value={data} onChange={setData} errors={missing(kind, extra, data)} />
            <FormField label={tr('Note to the reviewer')}>
              <Input {...register('note')} />
            </FormField>
          </>
        )}
      </FormDialog>
    </div>
  )
}
