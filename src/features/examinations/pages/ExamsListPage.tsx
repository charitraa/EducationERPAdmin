import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBranches } from '@/app/providers/BranchProvider'
import { PermissionGate } from '@/components/common/PermissionGate'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { useAcademicYearOptions } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { useProgramOptions } from '@/features/academics/programs/hooks/usePrograms'
import { useCrudState } from '@/hooks/useCrudState'
import { useListState } from '@/hooks/usePagination'
import { formatDate } from '@/lib/dates'
import { enumLabel, enumOptions } from '@/lib/formatters'
import { PERMS } from '@/shared/constants/permissions'
import type { Exam } from '../api/examinations.api'
import { ExamFormDialog } from '../components/ExamFormDialog'
import { useExams, useExamTypeOptions } from '../hooks/useExaminations'
import { tr } from '@/lib/i18n'

export function ExamStatusBadge({ status }: { status: Exam['status'] }) {
  return <StatusBadge status={status === 'published' ? 'published' : status} label={enumLabel('ExamStatusEnum', status)} />
}

export const examDates = (e: Pick<Exam, 'start_date' | 'end_date'>) =>
  e.start_date ? (e.end_date && e.end_date !== e.start_date ? `${formatDate(e.start_date)} – ${formatDate(e.end_date)}` : formatDate(e.start_date)) : tr('Not scheduled')

export default function ExamsListPage() {
  const navigate = useNavigate()
  const { isMultiBranch, branches, branchName, selectedBranchId } = useBranches()
  const list = useListState({ filters: ['status', 'exam_type', 'program', 'academic_year', 'campus'] })
  const query = useExams({ ...list.query, campus: list.filters.campus ?? selectedBranchId ?? undefined })
  const types = useExamTypeOptions()
  const programs = useProgramOptions()
  const years = useAcademicYearOptions()
  const crud = useCrudState<Exam>()

  const columns: Column<Exam>[] = [
    { id: 'name', header: tr('Exam'), sortField: 'name', mobile: 'title', cell: (e) => <span className="font-medium">{e.name}</span> },
    { id: 'type', header: tr('Type'), cell: (e) => e.exam_type_name },
    { id: 'program', header: tr('Program'), cell: (e) => `${e.program_name}${e.levels.length ? ` · ${e.levels.join(', ')}` : ''}` },
    { id: 'campus', header: tr('Branch'), hidden: !isMultiBranch, cell: (e) => branchName(e.campus) },
    { id: 'dates', header: tr('Dates'), sortField: 'start_date', className: 'whitespace-nowrap tabular-nums', cell: (e) => examDates(e) },
    { id: 'status', header: tr('Status'), cell: (e) => <ExamStatusBadge status={e.status} /> },
  ]

  return (
    <>
      <DataTable
        ariaLabel={tr('Exams')}
        columns={columns}
        query={query}
        list={list}
        getRowId={(e) => e.id}
        searchPlaceholder={tr('Search exams…')}
        onRowClick={(e) => navigate(`/examinations/${e.id}`)}
        toolbar={
          <PermissionGate permission={PERMS.exams.manage}>
            <Button onClick={crud.openCreate}>
              <Plus aria-hidden /> {tr('New exam')}
            </Button>
          </PermissionGate>
        }
        filters={[
          { name: 'status', label: tr('Status'), options: enumOptions('ExamStatusEnum') },
          { name: 'exam_type', label: tr('Type'), options: (types.data ?? []).map((t) => ({ value: String(t.id), label: t.name })) },
          { name: 'program', label: tr('Program'), options: (programs.data ?? []).map((p) => ({ value: String(p.id), label: p.name })) },
          { name: 'academic_year', label: tr('Year'), options: (years.data ?? []).map((y) => ({ value: String(y.id), label: y.name })) },
          { name: 'campus', label: tr('Branch'), hidden: !isMultiBranch, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
        empty={{
          title: tr('No exams yet'),
          description: tr('Create an exam, add its papers (one per subject and level), schedule it, then marks can be entered once each paper is sat.'),
          action: (
            <PermissionGate permission={PERMS.exams.manage}>
              <Button variant="outline" onClick={crud.openCreate}>
                {tr('Create the first exam')}
              </Button>
            </PermissionGate>
          ),
        }}
      />
      <ExamFormDialog open={crud.formOpen} record={crud.record} onOpenChange={(o) => !o && crud.closeForm()} onCreated={(e) => navigate(`/examinations/${e.id}`)} />
    </>
  )
}
