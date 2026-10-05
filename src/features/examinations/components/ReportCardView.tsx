import { formatDate, toBsDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { ReportCard, ReportLine, Transcript } from '../api/examinations.api'
import { ResultBadge } from './ResultBits'
import { tr } from '@/lib/i18n'

const n = (v: number | null | undefined) => (v == null ? '—' : String(v))

function Lines({ lines, caption }: { lines: ReportLine[]; caption: string }) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[34rem] border-collapse text-sm print:min-w-0" aria-label={caption}>
        <thead>
          <tr className="border-y bg-muted/50 text-left text-xs font-medium text-muted-foreground print:bg-transparent">
            <th className="px-3 py-1.5">{tr('Subject')}</th>
            <th className="px-2 py-1.5 text-right">{tr('Credit')}</th>
            <th className="px-2 py-1.5 text-right">{tr('Marks')}</th>
            <th className="px-2 py-1.5 text-right">%</th>
            <th className="px-2 py-1.5 text-center">{tr('Grade')}</th>
            <th className="px-2 py-1.5 text-right">{tr('GP')}</th>
            <th className="px-3 py-1.5">{tr('Remark')}</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {lines.map((l) => (
            <tr key={l.subject} className={cn(l.status === 'fail' && 'text-danger')}>
              <td className="px-3 py-1.5">
                {l.subject_name}
                {l.absent && <span className="ml-1 text-xs">{tr('(absent)')}</span>}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">{n(l.credit_hours)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                {n(l.obtained)} / {n(l.full)}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">{n(l.percentage)}</td>
              <td className="px-2 py-1.5 text-center font-medium">{l.letter || '—'}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{n(l.grade_point)}</td>
              <td className="px-3 py-1.5 text-xs">{l.remark}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}

/** One report card, laid out to print one per page. */
export function ReportCardView({ card }: { card: ReportCard }) {
  return (
    <article className="rounded-lg border bg-card p-4 sm:p-5 print:break-after-page print:rounded-none print:border-0 print:p-0">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.campus}</p>
          <h2 className="text-lg font-semibold">{card.title}</h2>
          <p className="text-sm text-muted-foreground">{[card.exam_type, card.academic_year, card.term].filter(Boolean).join(' · ')}</p>
        </div>
        <ResultBadge status={card.result} />
      </header>
      <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Fact label={tr('Student')} value={card.student.name} />
        <Fact label={tr('Number')} value={<span className="font-mono">{card.student.student_number}</span>} />
        <Fact label={tr('Class')} value={`${card.level_label} ${card.section}`} />
        <Fact label={tr('Program')} value={card.program} />
      </dl>
      <Lines lines={card.subjects} caption={tr('Subjects for {name}', { name: card.student.name })} />
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm sm:grid-cols-5">
        <Fact label={tr('Total')} value={`${n(card.total_obtained)} / ${n(card.total_full)}`} />
        <Fact label={tr('Percentage')} value={`${n(card.percentage)}%`} />
        <Fact label="GPA" value={`${n(card.grade_point)} ${card.letter}`} />
        <Fact label={tr('Rank')} value={card.rank_in_section ? tr('{rank} of {size} in class', { rank: card.rank_in_section, size: card.class_size }) : '—'} />
        <Fact label={tr('Attendance')} value={card.attendance?.percentage != null ? `${card.attendance.percentage}% (${card.attendance.attended}/${card.attendance.total})` : '—'} />
      </dl>
      {card.division && <p className="mt-2 text-sm">{tr('Division: {division}', { division: card.division })}</p>}
      {card.remark && (
        <p className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
          <span className="text-xs text-muted-foreground">{tr('Class teacher’s remark') + ':'} </span>
          {card.remark}
        </p>
      )}
      <footer className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>{card.grading.map((g) => `${g.letter} ${g.from}%+`).join(' · ')}</span>
        {card.published_at && <span>{tr('Published {date}', { date: formatDate(card.published_at.slice(0, 10)) })}</span>}
      </footer>
    </article>
  )
}

/** A student's whole transcript: every published result marked for it, and the cumulative GPA. */
export function TranscriptView({ t }: { t: Transcript }) {
  return (
    <article className="rounded-lg border bg-card p-4 sm:p-5 print:rounded-none print:border-0 print:p-0">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-3">
        <div>
          <h2 className="text-lg font-semibold">{tr('Academic transcript')}</h2>
          <p className="text-sm">
            {t.student.name} · <span className="font-mono">{t.student.student_number}</span>
            {t.student.date_of_birth && <span className="text-muted-foreground"> {'· ' + tr('born {date} (', { date: formatDate(t.student.date_of_birth) })}{toBsDate(t.student.date_of_birth)} {tr('BS)')}</span>}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <Fact label={tr('Cumulative GPA')} value={n(t.cumulative.gpa)} />
          <Fact label={tr('Credits')} value={n(t.cumulative.credits)} />
          <Fact label={tr('Credits passed')} value={n(t.cumulative.credits_passed)} />
        </dl>
      </header>
      {t.records.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr('No published result is marked for the transcript yet.')}</p>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
          {t.records.map((r) => (
            <section key={r.result_id} className="print:break-inside-avoid">
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">
                  {r.title} <span className="text-sm font-normal text-muted-foreground">· {r.academic_year} · {r.level_label}</span>
                </h3>
                <span className="text-sm">
                  {tr('{n}% · GPA {n2} {letter}', { n: n(r.percentage), n2: n(r.grade_point), letter: r.letter }) + ' ·'} <ResultBadge status={r.result} />
                </span>
              </div>
              <Lines lines={r.subjects} caption={r.title} />
            </section>
          ))}
        </div>
      )}
    </article>
  )
}
