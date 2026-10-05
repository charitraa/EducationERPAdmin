import { Briefcase, CalendarDays, ExternalLink, HeartHandshake, Loader2, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { z } from 'zod'
import { EmptyState } from '@/components/data-display/EmptyState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FileUpload } from '@/components/forms/FileUpload'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormError } from '@/components/forms/FormError'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Mentorship } from '@/features/alumni/api/alumni.api'
import type { JobOffer } from '@/features/careers/api/careers.api'
import { OfferStatus } from '@/features/careers/pages/CandidatePages'
import type { PublicVacancy } from '@/features/public/api/public.api'
import { answersPayload, blankAnswers, missingAnswers, nestedErrors, Questions, type Answers } from '@/features/public/components/PublicParts'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/useToast'
import { formatDate, formatDateTime } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { Id } from '@/shared/types/api'
import type { MentorCard, UpcomingAlumniEvent } from '../api/self.api'
import { Block, Loaded, MiniTable } from '../components/SelfParts'
import {
  useAlumniEvents,
  useApplyVacancy,
  useAskMentor,
  useMentors,
  useMentorshipAction,
  useMyMentorships,
  useMyOffers,
  useOpenVacancies,
  useRespondOffer,
  useRsvp,
  useWho,
} from '../hooks/useSelf'
import { tr } from '@/lib/i18n'

const TONE = { pending: 'warning', accepted: 'success', declined: 'danger', cancelled: 'muted', ended: 'muted' } as const

type Act = { m: Mentorship; action: 'accept' | 'decline' | 'end'; label: string }

/** Mentoring: asking a graduate for guidance, and (for mentors) answering requests. */
export function MyMentoringPage() {
  const { alumnus } = useWho()
  const mine = useMyMentorships()
  // A graduate who stopped mentoring still sees their own mentors; the list is for finding one.
  const mentors = useMentors(true)
  const ask = useAskMentor()
  const act = useMentorshipAction()
  const [asking, setAsking] = useState<MentorCard | null>(null)
  const [acting, setActing] = useState<Act | null>(null)
  const asMentor = (m: Mentorship) => alumnus != null && m.mentor === alumnus.id
  const open = new Set((mine.data ?? []).filter((m) => !asMentor(m) && (m.status === 'pending' || m.status === 'accepted')).map((m) => m.mentor))

  const actionsFor = (m: Mentorship): Act[] => {
    if (asMentor(m)) {
      if (m.status === 'pending')
        return [
          { m, action: 'accept', label: tr('Accept') },
          { m, action: 'decline', label: tr('Decline') },
        ]
      return m.status === 'accepted' ? [{ m, action: 'end', label: tr('End') }] : []
    }
    if (m.status === 'pending') return [{ m, action: 'end', label: tr('Withdraw') }]
    return m.status === 'accepted' ? [{ m, action: 'end', label: tr('End') }] : []
  }

  return (
    <div className="grid gap-6">
      <Block title={tr('My mentoring')}>
        <Loaded query={mine}>
          {(rows) => (
            <MiniTable
              label={tr('My mentoring')}
              rows={rows}
              rowKey={(m) => m.id}
              empty={{ title: tr('No mentoring yet'), icon: HeartHandshake, description: tr('Ask one of the graduates below to mentor you.') }}
              columns={[
                { header: tr('With'), cell: (m) => (asMentor(m) ? tr('{mentee_name} (your mentee)', { mentee_name: m.mentee_name }) : m.mentor_name) },
                { header: tr('Topic'), cell: (m) => m.topic },
                { header: tr('Status'), cell: (m) => <StatusBadge status={m.status} tone={TONE[m.status]} label={enumLabel('MentorshipStatusEnum', m.status)} /> },
                { header: tr('Since'), cell: (m) => formatDate(m.responded_at ?? m.created_at) },
                { header: tr('Note'), cell: (m) => m.note || (asMentor(m) && m.message ? m.message : '') },
                {
                  header: '',
                  className: 'text-right',
                  cell: (m) => (
                    <span className="inline-flex gap-1">
                      {actionsFor(m).map((a) => (
                        <Button key={a.action} size="sm" variant={a.action === 'accept' ? 'default' : 'outline'} onClick={() => setActing(a)}>
                          {a.label}
                        </Button>
                      ))}
                    </span>
                  ),
                },
              ]}
            />
          )}
        </Loaded>
      </Block>
      <Block title={tr('Find a mentor')} description={tr('Graduates who offer to guide students and younger alumni.')}>
        <Loaded query={mentors}>
          {(rows) => {
            const others = rows.filter((r) => r.id !== alumnus?.id)
            if (others.length === 0) return <EmptyState icon={Users} title={tr('No mentors listed yet')} />
            return (
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {others.map((r) => (
                  <li key={r.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                    <div>
                      <p className="font-medium">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[r.current_job ? tr('{title} at {employer}', { title: r.current_job.title, employer: r.current_job.employer }) : null, r.program_name, [r.city, r.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {r.mentor_topics && <p className="text-sm">{r.mentor_topics}</p>}
                    {r.bio && <p className="line-clamp-3 text-sm text-muted-foreground">{r.bio}</p>}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-muted-foreground">
                        {r.linkedin_url && (
                          <a href={r.linkedin_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
                            {tr('LinkedIn')} <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        )}
                      </span>
                      {open.has(r.id) ? (
                        <span className="text-xs text-muted-foreground">{tr('Asked')}</span>
                      ) : (
                        <Button size="sm" disabled={r.places_left === 0} onClick={() => setAsking(r)}>
                          {r.places_left === 0 ? tr('No places') : tr('Ask to mentor me')}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          }}
        </Loaded>
      </Block>
      <FormDialog
        open={asking !== null}
        onOpenChange={(o) => !o && setAsking(null)}
        title={tr('Ask {full_name}', { full_name: asking?.full_name ?? '' })}
        description={tr('They’re told and can accept or decline.')}
        submitLabel={tr('Send request')}
        schema={z.object({ topic: z.string().trim().min(1, tr('What would you like help with?')).max(200), message: z.string().max(2000) })}
        defaultValues={{ topic: '', message: '' }}
        onSubmit={async (v) => {
          await ask.mutateAsync({ mentor: asking!.id, topic: v.topic, message: v.message })
          toast.success(tr('Request sent.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <>
            <FormField label={tr('Topic')} required error={errors.topic?.message}>
              <Input {...register('topic')} placeholder={tr('Choosing a master’s program')} />
            </FormField>
            <FormField label={tr('Message')}>
              <Textarea {...register('message')} rows={4} placeholder={tr('A little about you and what you hope to get from it.')} />
            </FormField>
          </>
        )}
      </FormDialog>
      <FormDialog
        open={acting !== null}
        onOpenChange={(o) => !o && setActing(null)}
        title={acting ? `${acting.label}: ${acting.m.topic}` : ''}
        submitLabel={acting?.label ?? 'OK'}
        schema={z.object({ note: z.string().max(255) })}
        defaultValues={{ note: '' }}
        onSubmit={async (v) => {
          await act.mutateAsync({ id: acting!.m.id, action: acting!.action, note: v.note })
          toast.success(tr('Done.'))
        }}
      >
        {({ register }) => (
          <FormField label={tr('Note (optional)')}>
            <Input {...register('note')} />
          </FormField>
        )}
      </FormDialog>
    </div>
  )
}

const RESPONSES = [
  { value: 'going', label: tr('Going') },
  { value: 'maybe', label: tr('Maybe') },
  { value: 'declined', label: tr('Not going') },
] as const

function RsvpButtons({ e }: { e: UpcomingAlumniEvent }) {
  const rsvp = useRsvp()
  const [guests, setGuests] = useState(String(e.my_guests))
  const full = e.capacity != null && e.places_taken >= e.capacity && e.my_response !== 'going'
  const send = async (response: UpcomingAlumniEvent['my_response'] & string) => {
    try {
      await rsvp.mutateAsync({ id: e.id, response, guests: response === 'going' ? Number(guests) || 0 : 0 })
      toast.success(response === 'going' ? tr('See you there.') : tr('Answer saved.'))
    } catch {
      // The mutation's error toast says why.
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-md border p-0.5" role="radiogroup" aria-label={tr('Are you coming to {title}?', { title: e.title })}>
        {RESPONSES.map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={e.my_response === r.value}
            disabled={rsvp.isPending || (r.value === 'going' && full)}
            onClick={() => void send(r.value)}
            className={cn('rounded px-3 py-1 text-sm disabled:opacity-50', e.my_response === r.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {r.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {tr('Guests')}
        <Input
          className="h-8 w-16"
          inputMode="numeric"
          value={guests}
          onChange={(ev) => setGuests(ev.target.value.replace(/\D/g, '').slice(0, 2))}
          onBlur={() => {
            if (e.my_response === 'going' && Number(guests) !== e.my_guests) void send('going')
          }}
        />
      </label>
    </div>
  )
}

/** Alumni events coming up, and whether I'm coming. */
export function MyAlumniEventsPage() {
  const q = useAlumniEvents(true)
  return (
    <Loaded query={q}>
      {(events) =>
        events.length === 0 ? (
          <EmptyState icon={CalendarDays} title={tr('No alumni events coming up')} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {events.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(e.starts_at)}
                    {e.venue ? ` · ${e.venue}` : ''}
                    {e.campus_name ? ` · ${e.campus_name}` : ''}
                    {e.capacity != null ? ' · ' + tr('{places_taken}/{capacity} places', { places_taken: e.places_taken, capacity: e.capacity }) : ''}
                  </p>
                </div>
                {e.description && <p className="line-clamp-3 text-sm text-muted-foreground">{e.description}</p>}
                {e.online_url && (
                  <a href={e.online_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    {tr('Join online')} <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
                <div className="mt-auto pt-1">
                  <RsvpButtons e={e} />
                </div>
              </li>
            ))}
          </ul>
        )
      }
    </Loaded>
  )
}

// ---------------------------------------------------------------------------
// Jobs: applying while signed in (not staff), and offers
// ---------------------------------------------------------------------------
function ApplyDialog({ vacancy, onOpenChange }: { vacancy: PublicVacancy | null; onOpenChange: (o: boolean) => void }) {
  const { user } = useAuth()
  const { student, alumnus, parent } = useWho()
  const me = student ?? alumnus ?? parent
  const apply = useApplyVacancy()
  const [answers, setAnswers] = useState<Answers>({})
  const [cover, setCover] = useState('')
  const [resume, setResume] = useState<Id | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [openFor, setOpenFor] = useState<Id | null>(null)
  if (vacancy && openFor !== vacancy.id) {
    setOpenFor(vacancy.id)
    setAnswers(blankAnswers(vacancy.form_fields))
    setCover('')
    setResume(null)
    setErrors({})
    setMessage(null)
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!vacancy) return
    const gaps: Record<string, string> = missingAnswers(vacancy.form_fields, answers)
    if (vacancy.resume_required && resume == null) gaps.resume_file = 'Attach your CV.'
    setErrors(gaps)
    if (Object.keys(gaps).length) return setMessage(tr('Fill in the highlighted answers.'))
    const data: Record<string, unknown> = {
      first_name: me?.first_name || user?.first_name || '',
      last_name: me?.last_name || user?.last_name || '',
      email: me?.email || user?.email || '',
      phone: me?.phone || user?.phone || '',
      extra: answersPayload(vacancy.form_fields, answers),
    }
    if (me?.middle_name) data.middle_name = me.middle_name
    if (cover.trim()) data.cover_letter = cover
    try {
      await apply.mutateAsync({ id: vacancy.id, data, resume_file: resume })
      toast.success(tr('Application sent. Follow it under Applications.'))
      onOpenChange(false)
    } catch (err) {
      const { fields, message: m } = nestedErrors(err)
      setErrors(fields)
      setMessage(m)
    }
  }
  return (
    <Dialog open={vacancy !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{tr('Apply') + ':'} {vacancy?.title}</DialogTitle>
            <DialogDescription>{tr('Your name and contact details come from your record (')}{me?.full_name || user?.full_name}).</DialogDescription>
          </DialogHeader>
          <FormError message={message} />
          <FormField label="CV" required={vacancy?.resume_required} error={errors.resume_file} description={tr('PDF or Word, up to 5 MB.')}>
            {(p) => <FileUpload {...p} purpose="resume" types={['pdf', 'docx']} onChange={(f) => setResume(f?.id ?? null)} />}
          </FormField>
          <FormField label={tr('Cover letter')} error={errors.cover_letter}>
            {(p) => <Textarea {...p} value={cover} onChange={(e) => setCover(e.target.value)} rows={4} />}
          </FormField>
          {vacancy && vacancy.form_fields.length > 0 && <Questions fields={vacancy.form_fields} value={answers} onChange={setAnswers} errors={errors} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tr('Cancel')}
            </Button>
            <Button type="submit" disabled={apply.isPending}>
              {apply.isPending && <Loader2 className="animate-spin" aria-hidden />} {tr('Send application')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RespondDialog({ offer, onOpenChange }: { offer: { o: JobOffer; accept: boolean } | null; onOpenChange: (o: boolean) => void }) {
  const respond = useRespondOffer()
  return (
    <FormDialog
      open={offer !== null}
      onOpenChange={onOpenChange}
      title={offer?.accept ? tr('Accept the offer?') : tr('Decline the offer?')}
      description={offer ? tr('{vacancy_title}, starting {date}.', { vacancy_title: offer.o.vacancy_title, date: formatDate(offer.o.start_date) }) : undefined}
      submitLabel={offer?.accept ? tr('Accept') : tr('Decline')}
      schema={z.object({ note: z.string().max(255) })}
      defaultValues={{ note: '' }}
      onSubmit={async (v) => {
        await respond.mutateAsync({ id: offer!.o.id, accept: offer!.accept, note: v.note })
        toast.success(offer!.accept ? tr('Offer accepted.') : tr('Offer declined.'))
      }}
    >
      {({ register }) => (
        <FormField label={tr('Note (optional)')}>
          <Input {...register('note')} />
        </FormField>
      )}
    </FormDialog>
  )
}

/** Open vacancies to apply to while signed in, and offers made to me. */
export function MyJobsPage() {
  const vacancies = useOpenVacancies()
  const offers = useMyOffers()
  const [applying, setApplying] = useState<PublicVacancy | null>(null)
  const [responding, setResponding] = useState<{ o: JobOffer; accept: boolean } | null>(null)
  return (
    <div className="grid gap-6">
      {(offers.data?.length ?? 0) > 0 && (
        <Block title={tr('Offers made to you')}>
          <MiniTable
            label={tr('My offers')}
            rows={offers.data ?? []}
            rowKey={(o) => o.id}
            empty={{ title: '' }}
            columns={[
              { header: tr('Position'), cell: (o) => o.vacancy_title },
              { header: tr('Starts'), cell: (o) => formatDate(o.start_date) },
              { header: tr('Contract'), cell: (o) => enumLabel('ContractKindEnum', o.contract_kind) },
              { header: tr('Pay'), cell: (o) => o.salary_note || '—' },
              { header: tr('Answer by'), cell: (o) => formatDate(o.expires_on) },
              { header: tr('Status'), cell: (o) => <OfferStatus o={o} /> },
              {
                header: '',
                className: 'text-right',
                cell: (o) =>
                  o.status === 'made' ? (
                    <span className="inline-flex gap-1">
                      <Button size="sm" onClick={() => setResponding({ o, accept: true })}>
                        {tr('Accept')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setResponding({ o, accept: false })}>
                        {tr('Decline')}
                      </Button>
                    </span>
                  ) : null,
              },
            ]}
          />
        </Block>
      )}
      <Block title={tr('Open positions')} description={tr('Vacancies taking applications now.')}>
        <Loaded query={vacancies}>
          {(rows) =>
            rows.length === 0 ? (
              <EmptyState icon={Briefcase} title={tr('No open positions')} />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {rows.map((v) => (
                  <li key={v.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
                    <div>
                      <p className="font-medium">{v.title}</p>
                      <p className="text-xs text-muted-foreground">{[v.department_name, v.campus_name, enumLabel('ContractKindEnum', v.contract_kind), v.salary_range].filter(Boolean).join(' · ')}</p>
                    </div>
                    {v.description && <p className="line-clamp-3 text-sm text-muted-foreground">{v.description}</p>}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-muted-foreground">{v.closes_on ? tr('Apply by {date}', { date: formatDate(v.closes_on) }) : ''}</span>
                      <Button size="sm" onClick={() => setApplying(v)}>
                        {tr('Apply')}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )
          }
        </Loaded>
      </Block>
      <ApplyDialog vacancy={applying} onOpenChange={(o) => !o && setApplying(null)} />
      <RespondDialog offer={responding} onOpenChange={(o) => !o && setResponding(null)} />
    </div>
  )
}
