import { hhmm } from '@/features/timetable/api/timetable.api'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { AdmitCardData } from '../api/examinations.api'
import { tr } from '@/lib/i18n'

/**
 * An admit card (hall ticket) as printed. `compact` fits two to an A4 page
 * for the exam office's batch print, with a dashed line to cut along.
 */
export function AdmitCardDocument({ card: c, compact = false }: { card: AdmitCardData; compact?: boolean }) {
  const { user } = useAuth()
  return (
    <article
      className={cn(
        'rounded-lg border bg-card print:rounded-none',
        compact ? 'p-4 print:break-inside-avoid print:border-0 print:border-b print:border-dashed print:border-foreground/40 print:px-0 print:pb-6 print:pt-2' : 'p-6 print:border-0 print:p-0',
      )}
    >
      <header className={cn('border-b text-center', compact ? 'pb-2' : 'pb-3')}>
        <p className="text-lg font-semibold">{user?.organization?.name}</p>
        <p className="text-sm text-muted-foreground">{c.campus}</p>
        <h1 className={cn('font-bold uppercase tracking-wide', compact ? 'mt-1.5 text-base' : 'mt-3 text-xl')}>{tr('Admit card')}</h1>
        <p className="text-sm">
          {c.exam.name} · {c.exam.type}
        </p>
      </header>
      <dl className={cn('grid grid-cols-2 text-sm', compact ? 'my-3 gap-2 sm:grid-cols-3' : 'my-4 gap-3')}>
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
            <dd>{tr('{room}, seat {seat_number}', { room: c.seat.room, seat_number: c.seat.seat_number })}</dd>
          </div>
        )}
      </dl>
      <table className="w-full text-sm">
        <thead className="border-y text-left text-xs text-muted-foreground">
          <tr>
            <th className="py-1">{tr('Paper')}</th>
            <th className="py-1">{tr('Date')}</th>
            <th className="py-1">{tr('Time')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {c.papers.map((p, i) => (
            <tr key={i}>
              <td className="py-1">{p.subject_name}</td>
              <td className="py-1 tabular-nums">{p.date ? formatDate(p.date) : '—'}</td>
              <td className="py-1 tabular-nums">{p.start_time ? `${hhmm(p.start_time)}–${hhmm(p.end_time)}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {c.exam.instructions && <p className={cn('whitespace-pre-wrap text-xs', compact ? 'mt-2 line-clamp-4 print:line-clamp-none' : 'mt-4')}>{c.exam.instructions}</p>}
      <footer className={cn('flex justify-end', compact ? 'mt-8' : 'mt-14')}>
        <div className="w-48 border-t pt-2 text-center text-xs">{tr('Exam controller')}</div>
      </footer>
    </article>
  )
}
