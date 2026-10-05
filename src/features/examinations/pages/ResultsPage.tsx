import { MessageSquareText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { RowActions } from '@/components/common/RowActions'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Textarea } from '@/components/ui/textarea'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { enumOptions } from '@/lib/formatters'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { PERMS } from '@/shared/constants/permissions'
import type { ResultRow } from '../api/examinations.api'
import { pct } from '../components/ExamResultsPanel'
import { ResultBadge } from '../components/ResultBits'
import { useExamOptions, usePlans, useRemark, useResults } from '../hooks/useExaminations'
import { tr } from '@/lib/i18n'

/** Every computed result across exams and term results. Staff see them before publishing; students only after. */
export default function ResultsPage() {
  const list = useListState({ filters: ['exam', 'plan', 'status', 'level'], defaultOrdering: '-percentage' })
  const query = useResults(list.query)
  const exams = useExamOptions()
  const plans = usePlans(PICKER_PARAMS)
  const remark = useRemark()
  const [remarking, setRemarking] = useState<ResultRow | null>(null)
  const sourceName = (r: ResultRow) => (r.exam ? exams.data?.find((e) => e.id === r.exam)?.name : plans.data?.results.find((p) => p.id === r.plan)?.name) ?? '—'

  const columns: Column<ResultRow>[] = [
    {
      id: 'student',
      header: tr('Student'),
      mobile: 'title',
      cell: (r) => (
        <span>
          <Link to={`/examinations/report-cards?${r.exam ? `exam=${r.exam}` : `plan=${r.plan}`}&student=${r.student}`} className="font-medium hover:underline">
            {r.student_name}
          </Link>{' '}
          <span className="font-mono text-xs text-muted-foreground">{r.student_number}</span>
        </span>
      ),
    },
    { id: 'source', header: tr('Exam'), cell: sourceName },
    { id: 'section', header: tr('Class'), cell: (r) => r.section_name },
    { id: 'pct', header: '%', sortField: 'percentage', className: 'tabular-nums', cell: (r) => pct(r.percentage) },
    { id: 'gpa', header: 'GPA', sortField: 'grade_point', className: 'tabular-nums', cell: (r) => `${Number(r.grade_point)} ${r.letter}` },
    { id: 'rank', header: tr('Rank'), sortField: 'rank_in_section', className: 'tabular-nums', cell: (r) => r.rank_in_section ?? '—' },
    { id: 'status', header: tr('Result'), cell: (r) => <ResultBadge status={r.status} /> },
    { id: 'published', header: tr('Published'), mobile: 'hidden', cell: (r) => (r.published ? tr('Yes') : <span className="text-muted-foreground">{tr('Not yet')}</span>) },
  ]

  return (
    <>
      <DataTable
        ariaLabel={tr('Results')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(r) => r.id}
        searchPlaceholder={tr('Search students…')}
        filters={[
          { name: 'exam', label: tr('Exam'), options: (exams.data ?? []).map((e) => ({ value: String(e.id), label: e.name })) },
          { name: 'plan', label: tr('Term result'), options: (plans.data?.results ?? []).map((p) => ({ value: String(p.id), label: p.name })) },
          { name: 'status', label: tr('Result'), options: enumOptions('ResultStatusEnum') },
        ]}
        rowActions={(r) => <RowActions actions={[{ label: r.remark ? tr('Edit remark') : tr('Write remark'), icon: MessageSquareText, permission: PERMS.exams.mark, onSelect: () => setRemarking(r) }]} />}
        empty={{ title: tr('No results yet'), description: tr('Results appear once an exam’s marks are worked out.') }}
      />
      <FormDialog
        open={remarking != null}
        onOpenChange={(o) => !o && setRemarking(null)}
        title={remarking ? tr('Remark for {student_name}', { student_name: remarking.student_name }) : tr('Remark')}
        description={tr('Printed on the report card. The class teacher or the exam office can write it.')}
        schema={z.object({ remark: z.string().max(500) })}
        defaultValues={{ remark: remarking?.remark ?? '' }}
        onSubmit={async (v) => {
          await remark.mutateAsync({ id: remarking!.id, remark: v.remark })
          toast.success(tr('Remark saved.'))
        }}
      >
        {({ register, formState: { errors } }) => (
          <FormField label={tr('Remark')} error={errors.remark?.message}>
            <Textarea {...register('remark')} rows={3} maxLength={500} placeholder={tr('Consistent effort; needs more practice in algebra.')} />
          </FormField>
        )}
      </FormDialog>
    </>
  )
}
