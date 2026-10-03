import { Printer, ScrollText } from 'lucide-react'
import { useId, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { TranscriptView } from '../components/ReportCardView'
import { useTranscript } from '../hooks/useExaminations'

/** One student's transcript: published results marked for it, with a cumulative GPA. */
export default function TranscriptsPage() {
  const [params, setParams] = useSearchParams()
  const [student, setStudent] = useState<Student | null>(null)
  const id = student?.id ?? (params.get('student') ? Number(params.get('student')) : null)
  const transcript = useTranscript(id)
  const pickerId = useId()
  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3 print:hidden">
        <div className="grid w-full max-w-md gap-1.5">
          <Label htmlFor={pickerId}>Student</Label>
          <StudentPicker
            id={pickerId}
            value={student}
            onChange={(s) => {
              setStudent(s)
              setParams(s ? { student: String(s.id) } : {}, { replace: true })
            }}
          />
        </div>
        {transcript.data && (
          <Button variant="outline" className="ml-auto" onClick={() => window.print()}>
            <Printer aria-hidden /> Print
          </Button>
        )}
      </div>
      {id == null ? (
        <EmptyState title="Find a student" description="Their published results marked for the transcript, oldest first." icon={ScrollText} />
      ) : transcript.isPending ? (
        <TableSkeleton rows={6} columns={6} />
      ) : transcript.isError ? (
        <ErrorState error={transcript.error} onRetry={() => void transcript.refetch()} />
      ) : (
        <TranscriptView t={transcript.data} />
      )}
    </>
  )
}
