import { Award, CalendarDays, ClipboardCheck, FileBadge, MapPin, PartyPopper, Printer, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CertificateDocument } from '@/features/applications/pages/CertificatePages'
import { ReportCardView, TranscriptView } from '@/features/examinations/components/ReportCardView'
import { ResultBadge } from '@/features/examinations/components/ResultBits'
import { Money } from '@/features/finance/components/money'
import { hhmm } from '@/features/timetable/api/timetable.api'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/hooks/useToast'
import { formatDate, formatDateTime } from '@/lib/dates'
import { enumLabel } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { MyEvent } from '../api/self.api'
import { Block, Figure, Loaded, MiniTable, Note } from '../components/SelfParts'
import {
  useChildParam,
  useMyAdmitCard,
  useMyCertificates,
  useMyEvents,
  useMyExams,
  useMyReportCards,
  useMyStatement,
  useMyTranscript,
  useRegisterEvent,
  useSubject,
  useWithdrawRegistration,
} from '../hooks/useSelf'
import { tr } from '@/lib/i18n'

const paperTime = (p: { date: string | null; start_time: string | null; end_time: string | null }) =>
  [p.date ? formatDate(p.date) : tr('Date to be set'), p.start_time ? `${hhmm(p.start_time)}–${hhmm(p.end_time)}` : ''].filter(Boolean).join(' · ')

// ---------------------------------------------------------------------------
// Exams and admit cards
// ---------------------------------------------------------------------------
export function MyExamsPage() {
  const q = useMyExams(useChildParam())
  return (
    <Loaded query={q}>
      {(exams) =>
        exams.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title={tr('No exams scheduled')} description={tr('Exams for your class show here once they’re scheduled.')} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {exams.map((e) => (
              <article key={e.id} className="rounded-lg border bg-card p-4">
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{e.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {e.type} · {formatDate(e.start_date)} – {formatDate(e.end_date)}
                    </p>
                  </div>
                  {e.admit_card?.status === 'issued' && (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/me/exams/${e.id}/admit-card`}>
                        <Printer aria-hidden /> {tr('Admit card')}
                      </Link>
                    </Button>
                  )}
                </header>
                {e.admit_card?.status === 'withheld' && (
                  <p className="mt-3 rounded-md border border-danger/25 bg-danger-soft p-2 text-sm">{tr('Admit card withheld{value}. Contact the exam office.', { value: e.admit_card.withheld_reason ? `: ${e.admit_card.withheld_reason}` : '' })}</p>
                )}
                {e.seat && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" aria-hidden /> {tr('{room}, seat {seat_number}', { room: e.seat.room, seat_number: e.seat.seat_number })}
                  </p>
                )}
                <ul className="mt-3 divide-y text-sm">
                  {e.papers.map((p, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-x-3 py-1.5">
                      <span>{p.subject_name}</span>
                      <span className="tabular-nums text-muted-foreground">{paperTime(p)}</span>
                    </li>
                  ))}
                </ul>
                {e.instructions && <p className="mt-3 whitespace-pre-wrap text-xs text-muted-foreground">{e.instructions}</p>}
              </article>
            ))}
          </div>
        )
      }
    </Loaded>
  )
}

export function MyAdmitCardPage() {
  const exam = Number(useParams().examId)
  const q = useMyAdmitCard({ ...useChildParam(), exam })
  const { user } = useAuth()
  return (
    <Loaded query={q}>
      {(cards) => {
        const c = cards[0]
        if (!c) return <EmptyState title={tr('No admit card for this exam')} description={<Link to="/me/exams" className="text-primary hover:underline">{tr('Back to exams')}</Link>} />
        return (
          <div className="mx-auto max-w-2xl">
            <PageHeader
              className="print:hidden"
              backTo="/me/exams"
              title={tr('Admit card')}
              description={c.exam.name}
              actions={
                <Button variant="outline" onClick={() => window.print()} disabled={c.status !== 'issued'}>
                  <Printer aria-hidden /> {tr('Print')}
                </Button>
              }
            />
            <article className="rounded-lg border bg-card p-6 print:border-0 print:p-0">
              <header className="border-b pb-3 text-center">
                <p className="text-lg font-semibold">{user?.organization?.name}</p>
                <p className="text-sm text-muted-foreground">{c.campus}</p>
                <h1 className="mt-3 text-xl font-bold uppercase tracking-wide">{tr('Admit card')}</h1>
                <p className="text-sm">
                  {c.exam.name} · {c.exam.type}
                </p>
              </header>
              <dl className="my-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{tr('Student')}</dt>
                  <dd className="font-medium">{c.student.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{tr('Card number')}</dt>
                  <dd className="font-mono">{c.card_number}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{tr('Student number')}</dt>
                  <dd className="font-mono">{c.student.student_number}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{tr('Class')}</dt>
                  <dd>
                    {c.program} · {c.section}
                  </dd>
                </div>
                {c.seat && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{tr('Seat')}</dt>
                    <dd>
                      {tr('{room}, seat {seat_number}', { room: c.seat.room, seat_number: c.seat.seat_number })}
                    </dd>
                  </div>
                )}
              </dl>
              <table className="w-full text-sm">
                <thead className="border-y text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1.5">{tr('Paper')}</th>
                    <th className="py-1.5">{tr('Date')}</th>
                    <th className="py-1.5">{tr('Time')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {c.papers.map((p, i) => (
                    <tr key={i}>
                      <td className="py-1.5">{p.subject_name}</td>
                      <td className="py-1.5 tabular-nums">{p.date ? formatDate(p.date) : '—'}</td>
                      <td className="py-1.5 tabular-nums">{p.start_time ? `${hhmm(p.start_time)}–${hhmm(p.end_time)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {c.exam.instructions && <p className="mt-4 whitespace-pre-wrap text-xs">{c.exam.instructions}</p>}
              <footer className="mt-14 flex justify-end">
                <div className="w-48 border-t pt-2 text-center text-xs">{tr('Exam controller')}</div>
              </footer>
            </article>
          </div>
        )
      }}
    </Loaded>
  )
}

// ---------------------------------------------------------------------------
// Results: report cards and the transcript
// ---------------------------------------------------------------------------
export function MyResultsPage() {
  const child = useChildParam()
  const cards = useMyReportCards(child)
  const [view, setView] = useState<'cards' | 'transcript'>('cards')
  const [picked, setPicked] = useState<number | null>(null)
  const transcript = useMyTranscript(child, view === 'transcript')
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="inline-flex rounded-md border p-0.5" role="radiogroup" aria-label={tr('Show')}>
          {(
            [
              ['cards', 'Report cards'],
              ['transcript', 'Transcript'],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)} className={cn('rounded px-3 py-1 text-sm', view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer aria-hidden /> {tr('Print')}
        </Button>
      </div>
      {view === 'transcript' ? (
        <Loaded query={transcript}>{(t) => (t.records.length === 0 ? <EmptyState icon={Award} title={tr('No published results yet')} /> : <TranscriptView t={t} />)}</Loaded>
      ) : (
        <Loaded query={cards}>
          {(rows) => {
            if (rows.length === 0) return <EmptyState icon={Award} title={tr('No published results yet')} description={tr('Results show here once the school publishes them.')} />
            const card = rows.find((r) => r.result_id === picked) ?? rows[0]
            return (
              <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
                <ul className="grid content-start gap-1.5 print:hidden" aria-label={tr('Results')}>
                  {rows.map((r) => (
                    <li key={r.result_id}>
                      <button
                        type="button"
                        onClick={() => setPicked(r.result_id)}
                        aria-current={r.result_id === card.result_id}
                        className={cn('w-full rounded-md border px-3 py-2 text-left text-sm transition-colors', r.result_id === card.result_id ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted')}
                      >
                        <span className="block font-medium">{r.title}</span>
                        <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          {r.academic_year} · {r.percentage}% <ResultBadge status={r.result} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <ReportCardView card={card} />
              </div>
            )
          }}
        </Loaded>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------
export function MyFeesPage() {
  const q = useMyStatement(useChildParam())
  return (
    <Loaded query={q}>
      {(st) => (
        <div className="grid gap-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Figure label={tr('Billed')} value={<Money value={st.total_billed} tone="none" />} />
            <Figure label={tr('Paid')} value={<Money value={st.total_paid} tone="none" />} />
            <Figure label={tr('Still owed')} value={<Money value={st.balance} tone="none" className={cn(st.balance > 0 && 'text-danger')} />} />
          </div>
          <MiniTable
            label={tr('Invoices')}
            rows={st.invoices}
            rowKey={(i) => i.invoice}
            empty={{ title: tr('No invoices'), icon: Wallet }}
            columns={[
              { header: tr('Invoice'), cell: (i) => <span className="font-mono text-xs">{i.invoice_number}</span> },
              { header: tr('For'), cell: (i) => i.term_name ?? tr('One-time') },
              { header: tr('Issued'), cell: (i) => formatDate(i.issue_date) },
              { header: tr('Due'), cell: (i) => <span className={cn(i.is_overdue && 'font-medium text-danger')}>{formatDate(i.due_date)}</span> },
              { header: tr('Total'), cell: (i) => <Money value={i.total} tone="none" />, className: 'text-right' },
              { header: tr('Paid'), cell: (i) => <Money value={i.paid} tone="none" />, className: 'text-right' },
              { header: tr('Balance'), cell: (i) => (i.is_paid ? <StatusBadge status="paid" label={tr('Paid')} /> : <Money value={i.balance} tone="none" className="font-medium" />), className: 'text-right' },
            ]}
          />
          {st.balance > 0 && <Note>{tr('Pay at the accounts office; payments show here once they’re recorded.')}</Note>}
        </div>
      )}
    </Loaded>
  )
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
const REG_TONE = { pending: 'warning', confirmed: 'success', rejected: 'danger', withdrawn: 'muted' } as const

function EventCard({ e, canAct, onRegister, onWithdraw }: { e: MyEvent; canAct: boolean; onRegister: () => void; onWithdraw: () => void }) {
  const reg = e.my_registration
  const full = e.capacity != null && e.confirmed_count >= e.capacity
  return (
    <li className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{e.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatDateTime(e.start_at)}
            {e.venue ? ` · ${e.venue}` : ''}
            {e.category_name ? ` · ${e.category_name}` : ''}
          </p>
        </div>
        {reg && <StatusBadge status={reg.status} tone={REG_TONE[reg.status as keyof typeof REG_TONE]} label={enumLabel('RegistrationStatusEnum', reg.status)} />}
      </div>
      {e.description && <p className="line-clamp-3 text-sm text-muted-foreground">{e.description}</p>}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
        <span>
          {e.registration_mode === 'none' ? tr('No sign-up needed') : e.registration_deadline ? tr('Sign up by {dateTime}', { dateTime: formatDateTime(e.registration_deadline) }) : ''}
          {e.capacity != null && ' · ' + tr('{confirmed_count}/{capacity} places', { confirmed_count: e.confirmed_count, capacity: e.capacity })}
        </span>
        {canAct &&
          (reg && (reg.status === 'pending' || reg.status === 'confirmed') ? (
            !e.is_over && (
              <Button size="sm" variant="outline" onClick={onWithdraw}>
                {tr('Withdraw')}
              </Button>
            )
          ) : (
            e.registration_open &&
            e.registration_mode !== 'none' && (
              <Button size="sm" onClick={onRegister} disabled={full}>
                {full ? tr('Full') : e.registration_mode === 'approval' ? tr('Ask to join') : tr('Register')}
              </Button>
            )
          ))}
      </div>
    </li>
  )
}

export function MyEventsPage() {
  const s = useSubject()
  const q = useMyEvents(useChildParam())
  const register = useRegisterEvent()
  const withdraw = useWithdrawRegistration()
  const [registering, setRegistering] = useState<MyEvent | null>(null)
  const [withdrawing, setWithdrawing] = useState<MyEvent | null>(null)
  // Only the student signs up; a parent sees what their child has signed up for.
  const canAct = s.kind === 'student' && s.child == null
  return (
    <Loaded query={q}>
      {(events) => {
        const upcoming = events.filter((e) => !e.is_over)
        const past = events.filter((e) => e.is_over && e.my_registration)
        return (
          <div className="grid gap-6">
            <Block title={tr('Coming up')}>
              {upcoming.length === 0 ? (
                <EmptyState icon={PartyPopper} title={tr('No events coming up')} />
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {upcoming.map((e) => (
                    <EventCard key={e.id} e={e} canAct={canAct} onRegister={() => setRegistering(e)} onWithdraw={() => setWithdrawing(e)} />
                  ))}
                </ul>
              )}
            </Block>
            {past.length > 0 && (
              <Block title={tr('Past events you signed up for')}>
                <ul className="grid gap-3 md:grid-cols-2">
                  {past.map((e) => (
                    <EventCard key={e.id} e={e} canAct={false} onRegister={() => undefined} onWithdraw={() => undefined} />
                  ))}
                </ul>
              </Block>
            )}
            <FormDialog
              open={registering !== null}
              onOpenChange={(o) => !o && setRegistering(null)}
              title={registering?.registration_mode === 'approval' ? tr('Ask to join {name}', { name: registering?.name }) : tr('Register for {name}', { name: registering?.name ?? '' })}
              description={registering?.registration_mode === 'approval' ? tr('The organizer decides; you’ll be told.') : undefined}
              submitLabel={registering?.registration_mode === 'approval' ? tr('Ask') : tr('Register')}
              schema={z.object({ note: z.string().max(255) })}
              defaultValues={{ note: '' }}
              onSubmit={async (v) => {
                await register.mutateAsync({ id: registering!.id, note: v.note })
                toast.success(registering!.registration_mode === 'approval' ? tr('Request sent.') : tr('You’re registered.'))
              }}
            >
              {({ register: field }) =>
                registering?.registration_mode === 'approval' ? (
                  <FormField label={tr('Why you’d like to take part')}>
                    <Textarea {...field('note')} rows={3} />
                  </FormField>
                ) : (
                  <p className="text-sm text-muted-foreground">{formatDateTime(registering?.start_at)}</p>
                )
              }
            </FormDialog>
            <ConfirmDialog
              open={withdrawing !== null}
              onOpenChange={(o) => !o && setWithdrawing(null)}
              title={tr('Withdraw from {name}?', { name: withdrawing?.name ?? '' })}
              description={tr('Your place goes to someone else.')}
              confirmLabel={tr('Withdraw')}
              tone="destructive"
              onConfirm={async () => {
                await withdraw.mutateAsync(withdrawing!.my_registration!.id)
                toast.success(tr('Withdrawn.'))
                setWithdrawing(null)
              }}
            />
          </div>
        )
      }}
    </Loaded>
  )
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------
export function MyCertificatesPage() {
  const q = useMyCertificates()
  const s = useSubject()
  const child = s.kind === 'student' ? s.child : null
  return (
    <Block
      title={tr('Certificates')}
      description={
        <>
          {tr('Issued by the school. To ask for one, send a certificate')} <Link to="/me/applications" className="text-primary hover:underline">{tr('application')}</Link>.
        </>
      }
    >
      <Loaded query={q}>
        {(rows) => (
          <MiniTable
            label={tr('My certificates')}
            rows={child == null ? rows : rows.filter((c) => c.student === child)}
            rowKey={(c) => c.id}
            empty={{ title: tr('No certificates yet'), icon: FileBadge }}
            columns={[
              {
                header: tr('Certificate'),
                cell: (c) => (
                  <Link to={`/me/certificates/${c.id}`} className="font-medium text-primary hover:underline">
                    {c.title}
                  </Link>
                ),
              },
              { header: tr('Number'), cell: (c) => <span className="font-mono text-xs">{c.number}</span> },
              { header: tr('For'), cell: (c) => c.student_name },
              { header: tr('Issued'), cell: (c) => formatDate(c.issued_on) },
              { header: tr('Status'), cell: (c) => (c.is_valid ? <StatusBadge status="issued" label={tr('Valid')} tone="success" /> : <StatusBadge status="revoked" label={tr('Revoked')} tone="danger" />) },
            ]}
          />
        )}
      </Loaded>
    </Block>
  )
}

export function MyCertificatePage() {
  const id = Number(useParams().id)
  const q = useMyCertificates()
  return (
    <Loaded query={q}>
      {(rows) => {
        const c = rows.find((r) => r.id === id)
        if (!c) return <EmptyState icon={CalendarDays} title={tr('Certificate not found')} description={<Link to="/me/certificates" className="text-primary hover:underline">{tr('Back to certificates')}</Link>} />
        return (
          <div className="mx-auto max-w-3xl">
            <PageHeader
              className="print:hidden"
              backTo="/me/certificates"
              title={c.title}
              description={c.is_valid ? tr('No. {number}', { number: c.number }) : tr('Revoked: {revoked_reason}', { revoked_reason: c.revoked_reason })}
              actions={
                <Button variant="outline" onClick={() => window.print()} disabled={!c.is_valid}>
                  <Printer aria-hidden /> {tr('Print')}
                </Button>
              }
            />
            <CertificateDocument c={c} />
          </div>
        )
      }}
    </Loaded>
  )
}
