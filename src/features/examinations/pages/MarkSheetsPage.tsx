import { ClipboardList, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionHeader } from '@/components/common/SectionHeader'
import { DataTable, type Column } from '@/components/data-display/DataTable'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { useListState } from '@/hooks/usePagination'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { enumOptions } from '@/lib/formatters'
import { isStatus } from '@/shared/api/errors'
import { PERMS } from '@/shared/constants/permissions'
import type { MarkSheet, MyPaper } from '../api/examinations.api'
import { SheetBadge } from '../components/ExamMarksPanel'
import { useExamOptions, useMyPapers, useOpenSheet, useSheets } from '../hooks/useExaminations'

export function MyPapers() {
  const navigate = useNavigate()
  const mine = useMyPapers()
  const open = useOpenSheet()
  const [opening, setOpening] = useState<string | null>(null)
  const go = async (p: MyPaper) => {
    if (p.sheet != null) return navigate(`/examinations/mark-sheets/${p.sheet}`)
    const k = `${p.exam_subject}-${p.section}`
    setOpening(k)
    try {
      const sheet = await open.mutateAsync({ exam_subject: p.exam_subject, section: p.section })
      navigate(`/examinations/mark-sheets/${sheet.id}`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setOpening(null)
    }
  }
  if (mine.isPending) return <TableSkeleton rows={3} columns={4} />
  if (mine.isError && isStatus(mine.error, 404)) return <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Your account has no staff profile, so no papers are assigned to you.</p>
  if (mine.isError) return <ErrorState error={mine.error} onRetry={() => void mine.refetch()} />
  if (mine.data.length === 0) return <EmptyState title="No papers to mark" description="Papers of scheduled exams, for subjects you teach, appear here." icon={ClipboardList} />
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {mine.data.map((p) => {
        const k = `${p.exam_subject}-${p.section}`
        return (
          <li key={k} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {p.subject_name} <span className="font-normal text-muted-foreground">· {p.section_name}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {p.exam_name}
                {p.date ? ` · ${formatDate(p.date)}` : ''}
              </p>
            </div>
            <SheetBadge status={p.status} />
            {p.held ? (
              <Button size="sm" variant={p.sheet ? 'outline' : 'default'} onClick={() => void go(p)} disabled={opening != null}>
                {opening === k && <Loader2 className="animate-spin" aria-hidden />}
                {p.status === 'open' || p.status == null ? 'Enter marks' : 'View'}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Opens after the paper</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function AllSheets() {
  const navigate = useNavigate()
  const list = useListState({ filters: ['status', 'exam'] })
  const query = useSheets(list.query)
  const exams = useExamOptions({ status: undefined })
  const columns: Column<MarkSheet>[] = [
    {
      id: 'paper',
      header: 'Paper',
      mobile: 'title',
      cell: (s) => (
        <span className="font-medium">
          {s.subject_name} <span className="font-normal text-muted-foreground">· {s.section_name}</span>
        </span>
      ),
    },
    { id: 'exam', header: 'Exam', cell: (s) => s.exam_name },
    { id: 'date', header: 'Sat', className: 'tabular-nums', cell: (s) => formatDate(s.date) },
    { id: 'status', header: 'Status', cell: (s) => <SheetBadge status={s.status} /> },
  ]
  return (
    <DataTable
      ariaLabel="Mark sheets"
      columns={columns}
      query={query}
      list={list}
      getRowId={(s) => s.id}
      searchable={false}
      onRowClick={(s) => navigate(`/examinations/mark-sheets/${s.id}`)}
      filters={[
        { name: 'status', label: 'Status', options: enumOptions('MarkSheetStatusEnum') },
        { name: 'exam', label: 'Exam', options: (exams.data ?? []).map((e) => ({ value: String(e.id), label: e.name })) },
      ]}
      empty={{ title: 'No mark sheets yet', description: 'A sheet opens when a teacher (or the office) starts entering marks for a paper that has been sat.' }}
    />
  )
}

/** A teacher's papers to mark, and for the exam office every sheet and where it stands. */
export default function MarkSheetsPage() {
  const { can } = usePermissions()
  return (
    <div className="grid gap-8">
      {can(PERMS.exams.mark) && (
        <section>
          <SectionHeader title="My papers" description="Subjects you teach, in exams that are scheduled." />
          <MyPapers />
        </section>
      )}
      {can(PERMS.exams.view) && (
        <section>
          <SectionHeader title="All mark sheets" />
          <AllSheets />
        </section>
      )}
    </div>
  )
}
