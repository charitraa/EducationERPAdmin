import { useQuery } from '@tanstack/react-query'
import { Printer } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { PageLoader } from '@/components/data-display/LoadingState'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { useAuth } from '@/hooks/useAuth'
import { pluralize } from '@/lib/formatters'
import { fetchAllPages, PICKER_PARAMS } from '@/shared/api/pagination'
import { admitCardKeys, admitCardsApi, seatKeys, seatsApi, type AdmitCardData, type Exam, type Paper } from '../api/examinations.api'
import { AdmitCardDocument } from '../components/AdmitCardDocument'
import { useExam, useExamRooms, useInvigilations, usePapers } from '../hooks/useExaminations'
import { examDates } from './ExamsListPage'
import { tr } from '@/lib/i18n'

/** The exam, then the page; a 404 or 403 shows where the page would be. */
function WithExam({ children }: { children: (exam: Exam) => ReactNode }) {
  const exam = useExam(Number(useParams().id))
  if (exam.isPending) return <PageLoader />
  if (exam.isError) return <ErrorState error={exam.error} onRetry={() => void exam.refetch()} />
  return <>{children(exam.data)}</>
}

/** The whole set for one exam: seats and (optionally) one class's cards. */
function useExamSeats(exam: Exam) {
  return useQuery({ queryKey: [...seatKeys.all, 'all', exam.id], queryFn: () => fetchAllPages(seatsApi.list, { exam: exam.id, ordering: 'seat_number' }) })
}

function PrintButton({ disabled, count }: { disabled?: boolean; count?: number }) {
  return (
    <Button onClick={() => window.print()} disabled={disabled}>
      <Printer aria-hidden /> {count && count > 1 ? tr('Print all {count}', { count }) : tr('Print')}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Admit cards (hall tickets), a class at a time or the whole exam
// ---------------------------------------------------------------------------
export function AdmitCardsPrintPage() {
  return <WithExam>{(exam) => <AdmitCardsPrint exam={exam} />}</WithExam>
}

const byTime = (a: Paper, b: Paper) => `${a.date ?? '9'}${a.start_time ?? ''}`.localeCompare(`${b.date ?? '9'}${b.start_time ?? ''}`)

function AdmitCardsPrint({ exam }: { exam: Exam }) {
  const [params, setParams] = useSearchParams()
  const section = params.get('section') ?? ''
  const sectionId = useId()
  const { branchName } = useBranches()
  const papers = usePapers(exam.id)
  const classes = useClasses({ ...PICKER_PARAMS, campus: exam.campus, academic_year: exam.academic_year, program: exam.program, ordering: 'level' })
  const sitting = (classes.data?.results ?? []).filter((c) => exam.levels.includes(c.level))
  const chosen = section ? sitting.filter((c) => String(c.id) === section) : sitting
  const seats = useExamSeats(exam)

  const cards = useQuery({
    queryKey: [...admitCardKeys.all, 'print', exam.id, chosen.map((c) => c.id)],
    enabled: classes.isSuccess,
    queryFn: async () => {
      const perClass = await Promise.all(chosen.map(async (c) => ({ c, rows: await fetchAllPages(admitCardsApi.list, { exam: exam.id, enrollment__section: c.id, ordering: 'student__first_name' }) })))
      return perClass
    },
  })

  if (classes.isPending || cards.isPending || papers.isPending || seats.isPending) return <PageLoader />
  const failed = [classes, cards, papers, seats].find((q) => q.isError)
  if (failed) return <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />

  const seatOf = new Map((seats.data ?? []).map((s) => [s.enrollment, { room: s.room_name, seat_number: s.seat_number }]))
  const campus = branchName(exam.campus)
  const docs: Array<{ id: number; card: AdmitCardData }> = []
  let withheld = 0
  for (const { c, rows } of cards.data ?? []) {
    const classPapers = (papers.data ?? []).filter((p) => p.level === c.level).sort(byTime)
    for (const a of rows) {
      if (a.status !== 'issued') {
        withheld++
        continue
      }
      docs.push({
        id: a.id,
        card: {
          card_number: a.card_number,
          status: a.status,
          withheld_reason: a.withheld_reason ?? '',
          exam: { id: exam.id, name: exam.name, type: exam.exam_type_name ?? '', start_date: exam.start_date ?? '', end_date: exam.end_date ?? '', instructions: exam.instructions ?? '' },
          student: { id: a.student, name: a.student_name, student_number: a.student_number },
          campus: campus === '—' ? '' : campus,
          program: exam.program_name ?? '',
          section: a.section_name,
          seat: seatOf.get(a.enrollment) ?? null,
          papers: classPapers.map((p) => ({ subject_name: p.subject_name, date: p.date ?? null, start_time: p.start_time ?? null, end_time: p.end_time ?? null })),
        },
      })
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader className="print:hidden" backTo={`/examinations/${exam.id}?tab=cards`} title={tr('Print admit cards')} description={`${exam.name} · ${examDates(exam)}`} actions={<PrintButton disabled={!docs.length} count={docs.length} />} />
      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <div className="grid min-w-56 gap-1.5">
          <Label htmlFor={sectionId}>{tr('Class')}</Label>
          <SelectControl
            id={sectionId}
            value={section}
            onChange={(v) => setParams(v ? { section: v } : {}, { replace: true })}
            allowEmpty
            emptyLabel={tr('Every class sitting the exam')}
            options={sitting.map((c) => ({ value: String(c.id), label: c.display_name }))}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {tr('{cards} to print, two to a page.', { cards: pluralize(docs.length, 'card') })}
          {withheld > 0 && ' ' + tr('{count} withheld and left out.', { count: withheld })}
        </p>
      </div>
      {docs.length === 0 ? (
        <EmptyState title={tr('No admit cards to print')} description={tr('Issue admit cards from the exam’s Admit cards tab first.')} />
      ) : (
        <div className="grid gap-4 print:block">
          {docs.map((d) => (
            <AdmitCardDocument key={d.id} card={d.card} compact />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Seat plan: one sheet per room, which doubles as the attendance sheet
// ---------------------------------------------------------------------------
export function SeatPlanPrintPage() {
  return <WithExam>{(exam) => <SeatPlanPrint exam={exam} />}</WithExam>
}

const seatOrder = (a: { seat_number: string | number }, b: { seat_number: string | number }) => String(a.seat_number).localeCompare(String(b.seat_number), undefined, { numeric: true })

function SeatPlanPrint({ exam }: { exam: Exam }) {
  const { user } = useAuth()
  const { branchName } = useBranches()
  const [params, setParams] = useSearchParams()
  const room = params.get('room') ?? ''
  const roomId = useId()
  const rooms = useExamRooms(exam.id)
  const seats = useExamSeats(exam)
  const duties = useInvigilations(exam.id)
  const cards = useQuery({ queryKey: [...admitCardKeys.all, 'print', exam.id, 'all'], queryFn: () => fetchAllPages(admitCardsApi.list, { exam: exam.id }) })

  if (rooms.isPending || seats.isPending || duties.isPending || cards.isPending) return <PageLoader />
  const failed = [rooms, seats, duties, cards].find((q) => q.isError)
  if (failed) return <ErrorState error={failed.error} onRetry={() => void failed.refetch()} />

  const cardOf = new Map((cards.data ?? []).map((c) => [c.enrollment, c]))
  const campus = branchName(exam.campus)
  const sheets = (rooms.data ?? [])
    .filter((r) => !room || String(r.id) === room)
    .map((r) => ({
      room: r,
      seats: (seats.data ?? []).filter((s) => s.exam_room === r.id).sort(seatOrder),
      invigilators: [...new Set((duties.data ?? []).filter((d) => d.exam_room === r.id).map((d) => d.staff_name))],
    }))
    .filter((s) => s.seats.length > 0)
  const total = sheets.reduce((n, s) => n + s.seats.length, 0)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader className="print:hidden" backTo={`/examinations/${exam.id}?tab=seating`} title={tr('Print seat plan')} description={`${exam.name} · ${examDates(exam)}`} actions={<PrintButton disabled={!sheets.length} />} />
      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <div className="grid min-w-56 gap-1.5">
          <Label htmlFor={roomId}>{tr('Room')}</Label>
          <SelectControl
            id={roomId}
            value={room}
            onChange={(v) => setParams(v ? { room: v } : {}, { replace: true })}
            allowEmpty
            emptyLabel={tr('Every room')}
            options={(rooms.data ?? []).map((r) => ({ value: String(r.id), label: r.room_name }))}
          />
        </div>
        <p className="text-sm text-muted-foreground">{tr('One sheet per room: post it on the door, and students sign it at their seat. {students} in all.', { students: pluralize(total, 'student') })}</p>
      </div>
      {sheets.length === 0 ? (
        <EmptyState title={tr('No seat plan yet')} description={tr('Make the seat plan from the exam’s Seating tab first.')} />
      ) : (
        <div className="grid gap-6 print:block">
          {sheets.map(({ room: r, seats: list, invigilators }) => (
            <article key={r.id} className="rounded-lg border bg-card p-5 print:break-after-page print:rounded-none print:border-0 print:p-0">
              <header className="mb-3 border-b pb-3 text-center">
                <p className="font-semibold">{user?.organization?.name}</p>
                {campus !== '—' && <p className="text-sm text-muted-foreground">{campus}</p>}
                <h1 className="mt-2 text-lg font-bold">{exam.name}</h1>
                <p className="text-sm tabular-nums">{examDates(exam)}</p>
              </header>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold">{r.room_name}</h2>
                <p className="text-sm">{tr('{students} · {seats} seats', { students: pluralize(list.length, 'student'), seats: r.capacity ?? r.seats ?? list.length })}</p>
              </div>
              {invigilators.length > 0 && <p className="mb-3 text-sm">{tr('Invigilators: {names}', { names: invigilators.join(', ') })}</p>}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-y text-left text-xs text-muted-foreground">
                    <th className="w-16 py-1.5 pr-2">{tr('Seat')}</th>
                    <th className="py-1.5 pr-2">{tr('Student')}</th>
                    <th className="py-1.5 pr-2">{tr('Card number')}</th>
                    <th className="py-1.5 pr-2">{tr('Class')}</th>
                    <th className="w-40 py-1.5">{tr('Signature')}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => {
                    const card = cardOf.get(s.enrollment)
                    return (
                      <tr key={s.id} className="border-b print:break-inside-avoid">
                        <td className="py-2 pr-2 font-mono font-semibold">{s.seat_number}</td>
                        <td className="py-2 pr-2">
                          {s.student_name}
                          {card?.status === 'withheld' && <span className="ml-1.5 text-xs font-medium text-danger">({tr('card withheld')})</span>}
                        </td>
                        <td className="py-2 pr-2 font-mono text-xs">{card?.card_number ?? '—'}</td>
                        <td className="py-2 pr-2">{s.section_name}</td>
                        <td className="py-2" />
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <footer className="mt-10 flex justify-between text-xs">
                <span>{tr('Present: ______   Absent: ______')}</span>
                <span className="w-48 border-t pt-2 text-center">{tr('Invigilator')}</span>
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
