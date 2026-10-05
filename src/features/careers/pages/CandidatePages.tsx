import { Ban, CalendarClock, CalendarPlus, ClipboardCheck, Download, FileSignature, Gauge, Undo2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Controller } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { RowActions } from '@/components/common/RowActions'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { DatePicker } from '@/components/forms/DatePicker'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ApplicationStatus } from '@/features/applications/pages/ApplicationPages'
import { filesApi } from '@/features/files/api/files.api'
import { useStaffOptions } from '@/features/staff/hooks/useStaffOptions'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { combineLocal, formatDate, formatDateTime, splitLocal, todayIso } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { isoDate, optionalIsoDate } from '@/lib/validation'
import { apiClient } from '@/shared/api/client'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { StatusTone } from '@/shared/constants/statuses'
import type { Id } from '@/shared/types/api'
import type { Candidacy, CandidacyDetail, Interview, JobOffer } from '../api/careers.api'
import {
  useCancelInterview,
  useCandidacies,
  useCandidacy,
  useInterviewOutcome,
  useInterviews,
  useMakeOffer,
  useOffers,
  useRescheduleInterview,
  useScheduleInterview,
  useScreen,
  useVacancies,
  useWithdrawOffer,
} from '../hooks/useCareers'
import { tr } from '@/lib/i18n'

const hhmm = z.string().regex(/^\d{2}:\d{2}$/, tr('Use HH:MM.'))

/** The résumé is behind sign-in, so fetch it with the token and open it. */
async function openResume(id: Id) {
  try {
    const blob = await apiClient.get<Blob>(filesApi.downloadPath(id), { responseType: 'blob' }).then((r) => r.data)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

const candidateColumns = (withVacancy: boolean): Column<Candidacy>[] => [
  { id: 'name', header: tr('Candidate'), mobile: 'title', cell: (c) => (
    <span>
      <span className="font-medium">{c.full_name}</span>
      <span className="block text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(' · ')}</span>
    </span>
  ) },
  ...(withVacancy ? [{ id: 'vacancy', header: tr('Vacancy'), cell: (c: Candidacy) => c.vacancy_title } satisfies Column<Candidacy>] : []),
  { id: 'score', header: tr('Screening'), className: 'tabular-nums', cell: (c) => (c.screening_score != null ? `${c.screening_score}/100` : '—') },
  { id: 'applied', header: tr('Applied'), mobile: 'hidden', className: 'whitespace-nowrap tabular-nums', cell: (c) => formatDate(c.created_at) },
  { id: 'status', header: tr('Status'), cell: (c) => (c.hired_staff ? <StatusBadge status="completed" label={tr('Hired')} /> : <ApplicationStatus a={{ status: c.status as 'in_review', step_name: null }} />) },
]

/** Candidates, for one vacancy or all of them. */
export function CandidatesTable({ vacancy }: { vacancy?: Id }) {
  const navigate = useNavigate()
  const list = useListState({ filters: vacancy ? ['application__status'] : ['vacancy', 'application__status'] })
  const query = useCandidacies({ ...list.query, ...(vacancy ? { vacancy } : {}) })
  const vacancies = useVacancies({ ...PICKER_PARAMS }, { enabled: !vacancy })
  return (
    <DataTable
      ariaLabel={tr('Candidates')}
      columns={candidateColumns(!vacancy)}
      query={query}
      list={list}
      getRowId={(c) => c.id}
      searchPlaceholder={tr('Name, email or phone…')}
      onRowClick={(c) => navigate(`/careers/applications/${c.id}`)}
      filters={[
        { name: 'vacancy', label: tr('Vacancy'), options: (vacancies.data?.results ?? []).map((v) => ({ value: String(v.id), label: v.title })), hidden: Boolean(vacancy) },
        { name: 'application__status', label: tr('Status'), options: enumOptions('ApplicationStatusEnum') },
      ]}
      empty={{ title: tr('No candidates yet'), description: tr('They appear as people apply to an open vacancy.') }}
    />
  )
}

export const CandidatesPage = () => <CandidatesTable />

const INTERVIEW_TONE: Record<string, StatusTone> = { scheduled: 'info', completed: 'success', cancelled: 'muted', no_show: 'danger' }
const OFFER_TONE: Record<string, StatusTone> = { made: 'warning', accepted: 'success', declined: 'danger', withdrawn: 'muted' }
export const InterviewStatus = ({ i }: { i: Interview }) => <StatusBadge status={i.status ?? 'scheduled'} tone={INTERVIEW_TONE[i.status ?? 'scheduled']} label={enumLabel('InterviewStatusEnum', i.status)} />
export const OfferStatus = ({ o }: { o: JobOffer }) => <StatusBadge status={o.status ?? 'made'} tone={OFFER_TONE[o.status ?? 'made']} label={enumLabel('OfferStatusEnum', o.status)} />

export function ScheduleDialog({ candidacy, onOpenChange }: { candidacy: CandidacyDetail | null; onOpenChange: (o: boolean) => void }) {
  const schedule = useScheduleInterview()
  const staff = useStaffOptions()
  const existing = useInterviews({ ...PICKER_PARAMS, candidacy: candidacy?.id }, candidacy != null)
  return (
    <FormDialog
      open={candidacy !== null}
      onOpenChange={onOpenChange}
      title={tr('Interview {full_name}', { full_name: candidacy?.full_name ?? '' })}
      description={tr('The candidate and the panel are told.')}
      wide
      submitLabel={tr('Schedule')}
      schema={z.object({ date: isoDate, time: hhmm, duration: z.string().regex(/^\d+$/, tr('Minutes.')), mode: z.string(), location: z.string().max(255), round: z.string().regex(/^\d+$/), panel: z.array(z.string()) })}
      defaultValues={{ date: todayIso(), time: '10:00', duration: '30', mode: 'in_person', location: '', round: String((existing.data?.results.filter((i) => i.status !== 'cancelled').length ?? 0) + 1), panel: [] }}
      onSubmit={async (v) => {
        await schedule.mutateAsync({ candidacy: candidacy!.id, scheduled_at: combineLocal(v.date, v.time), duration_minutes: Number(v.duration), mode: v.mode as Interview['mode'], location: v.location, round: Number(v.round), panel: v.panel.map(Number) })
        toast.success(tr('Interview scheduled.'))
      }}
    >
      {({ register, control, formState: { errors } }) => (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField label={tr('Date')} required error={errors.date?.message} className="sm:col-span-2">
              {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label={tr('Time')} required error={errors.time?.message}>
              <Input {...register('time')} type="time" />
            </FormField>
            <FormField label={tr('Minutes')} error={errors.duration?.message}>
              <Input {...register('duration')} inputMode="numeric" />
            </FormField>
            <FormField label={tr('How')} className="sm:col-span-2">
              {(p) => <Controller control={control} name="mode" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={enumOptions('InterviewModeEnum')} />} />}
            </FormField>
            <FormField label={tr('Round')}>
              <Input {...register('round')} inputMode="numeric" />
            </FormField>
          </div>
          <FormField label={tr('Where')} description={tr('A room, or the call link.')}>
            <Input {...register('location')} maxLength={255} />
          </FormField>
          <FormField label={tr('Panel')}>
            {() => (
              <Controller
                control={control}
                name="panel"
                render={({ field }) => (
                  <ul className="grid max-h-40 gap-1 overflow-y-auto rounded-md border p-2 text-sm sm:grid-cols-2">
                    {(staff.data ?? []).map((s) => (
                      <li key={s.value}>
                        <label className="flex items-center gap-2">
                          <Checkbox checked={field.value.includes(s.value)} onCheckedChange={(c) => field.onChange(c ? [...field.value, s.value] : field.value.filter((x) => x !== s.value))} />
                          {s.label}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              />
            )}
          </FormField>
        </>
      )}
    </FormDialog>
  )
}

type InterviewAct = { kind: 'outcome' | 'reschedule' | 'cancel'; i: Interview }

export function InterviewDialogs({ acting, onDone }: { acting: InterviewAct | null; onDone: () => void }) {
  const outcome = useInterviewOutcome()
  const reschedule = useRescheduleInterview()
  const cancel = useCancelInterview()
  const i = acting?.i
  const close = (o: boolean) => !o && onDone()
  const at = splitLocal(i?.scheduled_at)
  return (
    <>
      <FormDialog
        open={acting?.kind === 'outcome'}
        onOpenChange={close}
        title={tr('How did it go? {candidate}', { candidate: i?.candidate ?? '' })}
        submitLabel={tr('Record')}
        schema={z.object({ status: z.string(), score: z.union([z.literal(''), z.string().regex(/^\d+(\.\d)?$/, tr('0 to 10.')).refine((v) => Number(v) <= 10, tr('0 to 10.'))]), recommendation: z.string(), feedback: z.string().max(5000) })}
        defaultValues={{ status: 'completed', score: '', recommendation: '', feedback: '' }}
        onSubmit={async (v) => {
          await outcome.mutateAsync({ id: i!.id, status: v.status as 'completed', score: v.score || null, recommendation: v.recommendation, feedback: v.feedback })
          toast.success(tr('Recorded.'))
        }}
      >
        {({ register, control, watch, formState: { errors } }) => (
          <>
            <FormField label={tr('Outcome')}>
              {(p) => <Controller control={control} name="status" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} options={[{ value: 'completed', label: tr('Held') }, { value: 'no_show', label: tr('Candidate didn’t come') }]} />} />}
            </FormField>
            {watch('status') === 'completed' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={tr('Score (0–10)')} error={errors.score?.message}>
                  <Input {...register('score')} inputMode="decimal" />
                </FormField>
                <FormField label={tr('Recommendation')}>
                  {(p) => <Controller control={control} name="recommendation" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty options={enumOptions('RecommendationEnum')} />} />}
                </FormField>
              </div>
            )}
            <FormField label={tr('Feedback')}>
              <Textarea {...register('feedback')} rows={3} />
            </FormField>
          </>
        )}
      </FormDialog>
      <FormDialog
        open={acting?.kind === 'reschedule'}
        onOpenChange={close}
        title={tr('Move the interview')}
        submitLabel={tr('Move')}
        schema={z.object({ date: isoDate, time: hhmm, location: z.string().max(255) })}
        defaultValues={{ date: at.date, time: at.time, location: i?.location ?? '' }}
        onSubmit={async (v) => {
          await reschedule.mutateAsync({ id: i!.id, scheduled_at: combineLocal(v.date, v.time), location: v.location })
          toast.success(tr('Moved; the candidate and panel are told.'))
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={tr('Date')} required error={errors.date?.message}>
              {(p) => <Controller control={control} name="date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
            </FormField>
            <FormField label={tr('Time')} required error={errors.time?.message}>
              <Input {...register('time')} type="time" />
            </FormField>
            <FormField label={tr('Where')} className="sm:col-span-2">
              <Input {...register('location')} />
            </FormField>
          </div>
        )}
      </FormDialog>
      <FormDialog
        open={acting?.kind === 'cancel'}
        onOpenChange={close}
        title={tr('Cancel the interview?')}
        description={tr('The candidate is told.')}
        submitLabel={tr('Cancel interview')}
        schema={z.object({ reason: z.string().trim().min(1, tr('Say why.')).max(255) })}
        defaultValues={{ reason: '' }}
        onSubmit={async (v) => {
          await cancel.mutateAsync({ id: i!.id, reason: v.reason })
          toast.success(tr('Cancelled.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Reason')} required error={errors.reason?.message}>
            <Input {...register('reason')} />
          </FormField>
        )}
      </FormDialog>
    </>
  )
}

export const interviewActions = (i: Interview, act: (a: InterviewAct) => void) => [
  // The backend takes an outcome only once the interview's time has come.
  { label: tr('Record outcome'), icon: ClipboardCheck, hidden: i.status !== 'scheduled' || new Date(i.scheduled_at) > new Date(), onSelect: () => act({ kind: 'outcome', i }) },
  { label: tr('Move'), icon: CalendarClock, permission: PERMS.careers.manage, hidden: i.status !== 'scheduled', onSelect: () => act({ kind: 'reschedule', i }) },
  { label: tr('Cancel'), icon: Ban, permission: PERMS.careers.manage, hidden: i.status !== 'scheduled', destructive: true, onSelect: () => act({ kind: 'cancel', i }) },
]

export function WithdrawOfferDialog({ offer, onOpenChange }: { offer: JobOffer | null; onOpenChange: (o: boolean) => void }) {
  const withdraw = useWithdrawOffer()
  return (
    <FormDialog
      open={offer !== null}
      onOpenChange={onOpenChange}
      title={tr('Withdraw the offer?')}
      submitLabel={tr('Withdraw')}
      schema={z.object({ reason: z.string().trim().min(1, tr('Say why.')).max(255) })}
      defaultValues={{ reason: '' }}
      onSubmit={async (v) => {
        await withdraw.mutateAsync({ id: offer!.id, reason: v.reason })
        toast.success(tr('Offer withdrawn.'))
      }}
    >
      {({ register, formState: { errors } }) => (
        <FormField label={tr('Reason')} required error={errors.reason?.message}>
          <Input {...register('reason')} />
        </FormField>
      )}
    </FormDialog>
  )
}

function Card({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border bg-card p-4 sm:p-6 ${className ?? ''}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const LABELS: Record<string, string> = { first_name: tr('First name'), middle_name: tr('Middle name'), last_name: tr('Last name'), date_of_birth: tr('Date of birth'), cover_letter: tr('Cover letter'), expected_salary: tr('Expected salary'), available_from: tr('Available from') }
const HIDE = new Set(['first_name', 'middle_name', 'last_name', 'email', 'phone', 'resume', 'extra'])

function Resume({ data }: { data: Record<string, unknown> }) {
  const r = (data.resume ?? {}) as { summary?: string; skills?: string[]; education?: Array<Record<string, unknown>>; experience?: Array<Record<string, unknown>> }
  const rest = Object.entries(data).filter(([k, v]) => !HIDE.has(k) && v !== '' && v != null)
  const extra = Object.entries((data.extra ?? {}) as Record<string, unknown>)
  return (
    <div className="grid gap-4 text-sm">
      {rest.length + extra.length > 0 && (
        <dl className="grid gap-3 sm:grid-cols-2">
          {[...rest, ...extra].map(([k, v]) => (
            <div key={k} className={k === 'cover_letter' ? 'sm:col-span-2' : undefined}>
              <dt className="text-xs text-muted-foreground">{LABELS[k] ?? k.replace(/_/g, ' ')}</dt>
              <dd className="whitespace-pre-wrap">{typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v) : String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {r.summary && <p className="whitespace-pre-wrap">{r.summary}</p>}
      {(r.experience ?? []).length > 0 && (
        <div>
          <h3 className="mb-1 font-medium">{tr('Experience')}</h3>
          <ul className="grid gap-1">
            {r.experience!.map((e, n) => (
              <li key={n}>
                {String(e.title)}, {String(e.employer)} <span className="text-muted-foreground">({formatDate(String(e.start_date))} – {e.end_date ? formatDate(String(e.end_date)) : 'now'})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {(r.education ?? []).length > 0 && (
        <div>
          <h3 className="mb-1 font-medium">{tr('Education')}</h3>
          <ul className="grid gap-1">
            {r.education!.map((e, n) => (
              <li key={n}>
                {String(e.qualification)}, {String(e.institution)}
                {e.year ? ` (${String(e.year)})` : ''}
                {e.score ? ` · ${String(e.score)}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
      {(r.skills ?? []).length > 0 && <p><span className="font-medium">{tr('Skills') + ':'}</span> {r.skills!.join(', ')}</p>}
    </div>
  )
}

/** One candidate: their application, screening, interviews and offer. Decisions happen on the application. */
export function CandidatePage() {
  const id = Number(useParams().id)
  const cand = useCandidacy(Number.isFinite(id) ? id : null)
  const interviews = useInterviews({ ...PICKER_PARAMS, candidacy: id })
  const offers = useOffers({ ...PICKER_PARAMS, candidacy: id })
  const screen = useScreen()
  const offer = useMakeOffer()
  const { can } = usePermissions()
  const [dialog, setDialog] = useState<'screen' | 'schedule' | 'offer' | null>(null)
  const [acting, setActing] = useState<InterviewAct | null>(null)
  const [withdrawing, setWithdrawing] = useState<JobOffer | null>(null)
  if (cand.isPending) return <PageLoader />
  if (cand.isError) return <ErrorState error={cand.error} onRetry={() => void cand.refetch()} />
  const c = cand.data
  const open = c.status === 'in_review' || c.status === 'returned'
  const live = (offers.data?.results ?? []).find((o) => o.status === 'made' || o.status === 'accepted')
  return (
    <div>
      <PageHeader
        backTo={`/careers/vacancies/${c.vacancy}`}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {c.full_name} {c.hired_staff ? <StatusBadge status="completed" label={tr('Hired')} /> : <ApplicationStatus a={{ status: c.status as 'in_review', step_name: null }} />}
          </span>
        }
        description={
          <>
            {c.vacancy_title} · <Link to={`/applications/${c.application}`} className="font-mono hover:underline">{c.application_number}</Link>
            {[c.email, c.phone].filter(Boolean).length > 0 && ` · ${[c.email, c.phone].filter(Boolean).join(' · ')}`}
          </>
        }
        actions={
          <>
            {c.resume && (
              <Button variant="outline" onClick={() => void openResume(c.resume!)}>
                <Download aria-hidden /> {c.resume_name ?? tr('Résumé')}
              </Button>
            )}
            {open && (
              <Button asChild>
                <Link to={`/applications/${c.application}`}>{tr('Decide on the application')}</Link>
              </Button>
            )}
            {c.hired_staff && (
              <Button asChild variant="outline">
                <Link to={`/staff/${c.hired_staff}`}>{tr('Staff record')}</Link>
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={tr('Application')} className="lg:col-span-2">
          <Resume data={c.data} />
        </Card>
        <Card title={tr('Screening')} action={open && can(PERMS.careers.manage) && <Button size="sm" variant="outline" className="h-7" onClick={() => setDialog('screen')}><Gauge aria-hidden /> {tr('Score')}</Button>}>
          {c.screening_score == null && !c.screening_note ? (
            <p className="text-sm text-muted-foreground">{tr('Not screened yet.')}</p>
          ) : (
            <div className="text-sm">
              {c.screening_score != null && <p className="text-2xl font-semibold tabular-nums">{c.screening_score}<span className="text-sm font-normal text-muted-foreground">/100</span></p>}
              {c.screening_note && <p className="mt-1 whitespace-pre-wrap">{c.screening_note}</p>}
            </div>
          )}
        </Card>
        <Card title={tr('Interviews')} className="lg:col-span-2" action={open && can(PERMS.careers.manage) && <Button size="sm" variant="outline" className="h-7" onClick={() => setDialog('schedule')}><CalendarPlus aria-hidden /> {tr('Schedule')}</Button>}>
          {(interviews.data?.results ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr('None yet.')}</p>
          ) : (
            <ul className="divide-y text-sm">
              {interviews.data!.results.map((i) => (
                <li key={i.id} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2">
                  <span className="font-medium">{tr('Round {round}', { round: i.round })}</span>
                  <span className="flex-1 text-muted-foreground">
                    {formatDateTime(i.scheduled_at)} · {enumLabel('InterviewModeEnum', i.mode)}
                    {i.location && ` · ${i.location}`}
                    {(i.panel_names ?? []).length > 0 && <span className="block">{tr('Panel: {panel_names}', { panel_names: i.panel_names!.join(', ') })}</span>}
                    {i.status === 'completed' && (
                      <span className="block text-foreground">
                        {i.score != null && `${Number(i.score)}/10 · `}
                        {i.recommendation && enumLabel('RecommendationEnum', i.recommendation)}
                        {i.feedback && ` — ${i.feedback}`}
                      </span>
                    )}
                  </span>
                  <InterviewStatus i={i} />
                  <RowActions actions={interviewActions(i, setActing)} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={tr('Offer')} action={open && !live && can(PERMS.careers.hire) && <Button size="sm" variant="outline" className="h-7" onClick={() => setDialog('offer')}><FileSignature aria-hidden /> {tr('Make offer')}</Button>}>
          {(offers.data?.results ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{tr('No offer made. Offers are made at the job form’s last step.')}</p>
          ) : (
            <ul className="grid gap-3 text-sm">
              {offers.data!.results.map((o) => (
                <li key={o.id} className="grid gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <OfferStatus o={o} />
                    <RowActions actions={[{ label: tr('Withdraw'), icon: Undo2, permission: PERMS.careers.hire, hidden: !(o.status === 'made' || o.status === 'accepted') || Boolean(c.hired_staff), destructive: true, onSelect: () => setWithdrawing(o) }]} />
                  </div>
                  <p>
                    {enumLabel('ContractKindEnum', o.contract_kind)} {tr('from {date}', { date: formatDate(o.start_date) })}
                    {o.salary_note && ` · ${o.salary_note}`}
                  </p>
                  {o.expires_on && o.status === 'made' && <p className="text-xs text-muted-foreground">{tr('Answer by {date}', { date: formatDate(o.expires_on) })}</p>}
                  {o.response_note && <p className="text-xs text-muted-foreground">“{o.response_note}”</p>}
                </li>
              ))}
            </ul>
          )}
          {live?.status === 'accepted' && open && <p className="mt-3 text-xs text-success">{tr('Accepted: approve the application’s last step to hire.')}</p>}
        </Card>
      </div>

      <FormDialog
        open={dialog === 'screen'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={tr('Screening')}
        submitLabel={tr('Save')}
        schema={z.object({ score: z.union([z.literal(''), z.string().regex(/^\d+$/, tr('0 to 100.')).refine((v) => Number(v) <= 100, tr('0 to 100.'))]), note: z.string().max(5000) })}
        defaultValues={{ score: c.screening_score != null ? String(c.screening_score) : '', note: c.screening_note ?? '' }}
        onSubmit={async (v) => {
          await screen.mutateAsync({ id: c.id, score: v.score === '' ? null : Number(v.score), note: v.note })
          toast.success(tr('Screening saved.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <>
            <FormField label={tr('Score (0–100)')} error={errors.score?.message}>
              <Input {...register('score')} inputMode="numeric" />
            </FormField>
            <FormField label={tr('Note')}>
              <Textarea {...register('note')} rows={3} />
            </FormField>
          </>
        )}
      </FormDialog>
      <ScheduleDialog candidacy={dialog === 'schedule' ? c : null} onOpenChange={(o) => !o && setDialog(null)} />
      <FormDialog
        open={dialog === 'offer'}
        onOpenChange={(o) => !o && setDialog(null)}
        title={tr('Offer to {full_name}', { full_name: c.full_name })}
        description={tr('Only at the job form’s last step. The candidate is told and accepts or declines.')}
        wide
        submitLabel={tr('Make offer')}
        schema={z.object({ start_date: isoDate, contract_kind: z.string(), probation_ends_on: optionalIsoDate, contract_end_date: optionalIsoDate, expires_on: optionalIsoDate, salary_note: z.string().max(255), terms: z.string().max(5000) })}
        defaultValues={{ start_date: '', contract_kind: '', probation_ends_on: '', contract_end_date: '', expires_on: '', salary_note: '', terms: '' }}
        onSubmit={async (v) => {
          await offer.mutateAsync({ candidacy: c.id, start_date: v.start_date, ...(v.contract_kind ? { contract_kind: v.contract_kind as JobOffer['contract_kind'] } : {}), probation_ends_on: v.probation_ends_on || null, contract_end_date: v.contract_end_date || null, expires_on: v.expires_on || null, salary_note: v.salary_note, terms: v.terms })
          toast.success(tr('Offer made.'))
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={tr('Starts')} required error={errors.start_date?.message}>
                {(p) => <Controller control={control} name="start_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              <FormField label={tr('Contract')} description={tr('Empty: the vacancy’s.')}>
                {(p) => <Controller control={control} name="contract_kind" render={({ field }) => <SelectControl {...p} value={field.value} onChange={field.onChange} allowEmpty emptyLabel={tr('As the vacancy')} options={enumOptions('ContractKindEnum')} />} />}
              </FormField>
              <FormField label={tr('Probation ends')} error={errors.probation_ends_on?.message}>
                {(p) => <Controller control={control} name="probation_ends_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              <FormField label={tr('Contract ends')} error={errors.contract_end_date?.message} description={tr('Empty: open-ended.')}>
                {(p) => <Controller control={control} name="contract_end_date" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
              <FormField label={tr('Salary offered')} description={tr('Payroll sets the actual pay.')}>
                <Input {...register('salary_note')} placeholder={tr('NPR 50,000 a month')} />
              </FormField>
              <FormField label={tr('Answer by')} error={errors.expires_on?.message}>
                {(p) => <Controller control={control} name="expires_on" render={({ field }) => <DatePicker {...p} value={field.value} onChange={field.onChange} onBlur={field.onBlur} />} />}
              </FormField>
            </div>
            <FormField label={tr('Terms')}>
              <Textarea {...register('terms')} rows={3} />
            </FormField>
          </>
        )}
      </FormDialog>
      <InterviewDialogs acting={acting} onDone={() => setActing(null)} />
      <WithdrawOfferDialog offer={withdrawing} onOpenChange={(o) => !o && setWithdrawing(null)} />
    </div>
  )
}

/** Every interview: upcoming first. */
export function InterviewsPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['status', 'mode'] })
  const query = useInterviews(list.query)
  const [acting, setActing] = useState<InterviewAct | null>(null)
  const columns: Column<Interview>[] = [
    { id: 'when', header: tr('When'), className: 'whitespace-nowrap tabular-nums', cell: (i) => formatDateTime(i.scheduled_at) },
    { id: 'who', header: tr('Candidate'), mobile: 'title', cell: (i) => <span className="font-medium">{i.candidate}</span> },
    { id: 'vacancy', header: tr('Vacancy'), cell: (i) => i.vacancy_title },
    { id: 'round', header: tr('Round'), className: 'tabular-nums', cell: (i) => i.round },
    { id: 'how', header: tr('How'), mobile: 'hidden', cell: (i) => `${enumLabel('InterviewModeEnum', i.mode)}${i.location ? ` · ${i.location}` : ''}` },
    { id: 'panel', header: tr('Panel'), mobile: 'hidden', cell: (i) => (i.panel_names ?? []).join(', ') || '—' },
    { id: 'status', header: tr('Status'), cell: (i) => <InterviewStatus i={i} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Interviews')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(i) => i.id}
        searchable={false}
        onRowClick={(i) => navigate(`/careers/applications/${i.candidacy}`)}
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('InterviewStatusEnum') },
          { name: 'mode', label: tr('How'), options: enumOptions('InterviewModeEnum') },
        ]}
        rowActions={(i) => <RowActions actions={interviewActions(i, setActing)} />}
        empty={{ title: tr('No interviews'), description: tr('Schedule one from a candidate’s page.') }}
      />
      <InterviewDialogs acting={acting} onDone={() => setActing(null)} />
    </>
  )
}

/** Every offer made, and how the candidate answered. */
export function OffersPage() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['status'] })
  const query = useOffers(list.query)
  const [withdrawing, setWithdrawing] = useState<JobOffer | null>(null)
  const columns: Column<JobOffer>[] = [
    { id: 'who', header: tr('Candidate'), mobile: 'title', cell: (o) => <span className="font-medium">{o.candidate}</span> },
    { id: 'vacancy', header: tr('Vacancy'), cell: (o) => o.vacancy_title },
    { id: 'start', header: tr('Starts'), className: 'whitespace-nowrap tabular-nums', cell: (o) => formatDate(o.start_date) },
    { id: 'contract', header: tr('Contract'), mobile: 'hidden', cell: (o) => enumLabel('ContractKindEnum', o.contract_kind) },
    { id: 'salary', header: tr('Salary'), mobile: 'hidden', cell: (o) => o.salary_note || '—' },
    { id: 'status', header: tr('Status'), cell: (o) => <OfferStatus o={o} /> },
  ]
  return (
    <>
      <DataTable
        ariaLabel={tr('Job offers')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(o) => o.id}
        searchable={false}
        onRowClick={(o) => navigate(`/careers/applications/${o.candidacy}`)}
        filters={[{ name: 'status', label: tr('Status'), options: enumOptions('OfferStatusEnum') }]}
        rowActions={(o) => <RowActions actions={[{ label: tr('Withdraw'), icon: Undo2, permission: PERMS.careers.hire, hidden: o.status !== 'made', destructive: true, onSelect: () => setWithdrawing(o) }]} />}
        empty={{ title: tr('No offers'), description: tr('Offers are made from a candidate’s page at the job form’s last step.') }}
      />
      <WithdrawOfferDialog offer={withdrawing} onOpenChange={(o) => !o && setWithdrawing(null)} />
    </>
  )
}
