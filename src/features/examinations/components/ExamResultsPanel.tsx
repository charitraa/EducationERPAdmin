import { Calculator, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { PERMS } from '@/shared/constants/permissions'
import type { Exam, ResultCounts, ResultRow } from '../api/examinations.api'
import { useComputeExam, useExamSummary, useResults } from '../hooks/useExaminations'
import { ResultBadge, resultCountsText } from './ResultBits'
import { tr } from '@/lib/i18n'

export const pct = (v: number | string | null | undefined) => (v == null ? '—' : `${Number(v)}%`)

/** Pass rates, subject averages and toppers, then every student's result. */
export function ExamResultsPanel({ exam }: { exam: Exam }) {
  const { can } = usePermissions()
  const summary = useExamSummary(exam.id, exam.status !== 'draft')
  const list = useListState({ filters: ['status', 'section'], defaultOrdering: '-percentage' })
  const results = useResults({ ...list.query, exam: exam.id }, exam.status !== 'draft')
  const compute = useComputeExam()
  const [computing, setComputing] = useState(false)

  if (exam.status === 'draft') return <EmptyState title={tr('No results yet')} description={tr('Results are worked out from verified marks once the exam is scheduled.')} />

  const columns: Column<ResultRow>[] = [
    { id: 'rank', header: tr('Rank'), sortField: 'rank_in_level', className: 'w-16 tabular-nums', cell: (r) => r.rank_in_level ?? '—' },
    {
      id: 'student',
      header: tr('Student'),
      mobile: 'title',
      cell: (r) => (
        <Link to={`/examinations/report-cards?exam=${exam.id}&student=${r.student}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
          {r.student_name}
        </Link>
      ),
    },
    { id: 'section', header: tr('Class'), cell: (r) => r.section_name },
    { id: 'marks', header: tr('Marks'), className: 'tabular-nums', cell: (r) => `${Number(r.total_obtained)} / ${Number(r.total_full)}` },
    { id: 'pct', header: '%', sortField: 'percentage', className: 'tabular-nums', cell: (r) => pct(r.percentage) },
    { id: 'gpa', header: 'GPA', sortField: 'grade_point', className: 'tabular-nums', cell: (r) => `${Number(r.grade_point)} ${r.letter}` },
    { id: 'division', header: tr('Division'), mobile: 'hidden', cell: (r) => r.division || '—' },
    { id: 'status', header: tr('Result'), cell: (r) => <ResultBadge status={r.status} /> },
  ]

  const s = summary.data
  return (
    <div className="grid gap-6">
      {exam.status === 'scheduled' && can(PERMS.exams.manage) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
          <p className="flex-1 text-sm text-muted-foreground">{tr('Results update from the marks entered so far. Students and parents see nothing until you publish.')}</p>
          <Button variant="outline" onClick={() => setComputing(true)}>
            <Calculator aria-hidden /> {tr('Work out results')}
          </Button>
        </div>
      )}
      {summary.isPending ? (
        <TableSkeleton rows={3} columns={4} />
      ) : summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : s && s.results > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tr('Pass rate')}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{pct(s.pass_rate)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tr('Average')}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{pct(s.average_percentage)}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{tr('Results')}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{s.results}</p>
              <p className="text-xs text-muted-foreground">{resultCountsText(s.by_status)}</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            {s.subjects.length > 0 && (
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm" aria-label={tr('By subject')}>
                  <thead className="bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">{tr('Subject')}</th>
                      <th className="px-3 py-2 text-right">{tr('Pass rate')}</th>
                      <th className="px-3 py-2 text-right">{tr('Average')}</th>
                      <th className="px-3 py-2 text-right">{tr('Highest')}</th>
                      <th className="px-3 py-2 text-right">{tr('Lowest')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {s.subjects.map((x) => (
                      <tr key={x.subject_name}>
                        <td className="px-3 py-2 font-medium">{x.subject_name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(x.pass_rate)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(x.average)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(x.highest)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(x.lowest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.toppers.length > 0 && (
              <section className="rounded-lg border bg-card">
                <h3 className="flex items-center gap-2 border-b px-4 py-2 text-sm font-semibold">
                  <Trophy className="h-4 w-4 text-warning" aria-hidden /> {tr('Toppers')}
                </h3>
                <ol className="divide-y text-sm">
                  {s.toppers.map((t) => (
                    <li key={t.student} className="flex items-center gap-2 px-4 py-2">
                      <span className="w-6 tabular-nums text-muted-foreground">{t.rank_in_level ?? '—'}</span>
                      <span className="flex-1">
                        {t.student_name} <span className="text-xs text-muted-foreground">· {t.section_name}</span>
                      </span>
                      <span className="tabular-nums">{pct(t.percentage)}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </>
      ) : null}
      <section>
        <SectionHeader title={tr('Every result')} />
        <DataTable
          ariaLabel={tr('Results')}
          columns={columns}
          query={results}
          list={list}
          getRowId={(r) => r.id}
          searchPlaceholder={tr('Search students…')}
          empty={{ title: tr('No results worked out yet'), description: can(PERMS.exams.manage) ? tr('Use Work out results once marks are in.') : undefined }}
        />
      </section>
      <ConfirmDialog
        open={computing}
        onOpenChange={setComputing}
        title={tr('Work out results now?')}
        description={tr('From the marks entered so far. Missing marks show as incomplete. Nothing is published.')}
        confirmLabel={tr('Work out')}
        onConfirm={async () => {
          const r = (await compute.mutateAsync(exam.id)) as { results: ResultCounts }
          toast.success(tr('Results worked out: {resultCountsText}.', { resultCountsText: resultCountsText(r.results) || 'none' }))
        }}
      />
    </div>
  )
}
