import { Plus, Trophy } from 'lucide-react'
import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { PermissionGate } from '@/components/common/PermissionGate'
import { SectionHeader } from '@/components/common/SectionHeader'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { TableSkeleton } from '@/components/data-display/LoadingState'
import { FormDialog } from '@/components/forms/FormDialog'
import { FormField } from '@/components/forms/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Student } from '@/features/students/api/students.api'
import { StudentPicker } from '@/features/students/components/StudentPicker'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { PERMS } from '@/shared/constants/permissions'
import { useAwardPoints, useLeaderboard } from '../hooks/useEvents'

const MEDALS = ['text-yellow-500', 'text-slate-400', 'text-amber-700']

const schema = z.object({
  student: z.custom<Student | null>().refine((s) => s != null, 'Choose a student.'),
  points: z.string().trim().regex(/^-?[1-9]\d*$/, 'A whole number; negative to take points away.'),
  reason: z.string().trim().min(1, 'Required: the student sees it.').max(255),
})

export default function LeaderboardPage() {
  const board = useLeaderboard()
  const award = useAwardPoints()
  const { can } = usePermissions()
  const [giving, setGiving] = useState(false)

  return (
    <>
      <SectionHeader
        title="Leaderboard"
        description="The 20 students with the most points across all events."
        action={
          <PermissionGate permission={PERMS.events.manage}>
            <Button onClick={() => setGiving(true)}>
              <Plus aria-hidden /> Give points
            </Button>
          </PermissionGate>
        }
      />
      <div className="rounded-lg border bg-card">
        {board.isPending ? (
          <TableSkeleton rows={5} columns={3} />
        ) : board.isError ? (
          <ErrorState error={board.error} onRetry={() => void board.refetch()} />
        ) : board.data.length === 0 ? (
          <EmptyState title="No points yet" description="Points come from point rules when students are checked in or win, or are given by hand." icon={Trophy} />
        ) : (
          <ol className="divide-y">
            {board.data.map((r) => (
              <li key={r.student} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-8 text-center font-semibold tabular-nums">
                  {r.rank <= 3 ? <Trophy className={cn('mx-auto h-5 w-5', MEDALS[r.rank - 1])} aria-label={`Rank ${r.rank}`} /> : r.rank}
                </span>
                <div className="min-w-0 flex-1">
                  {can(PERMS.students.view) ? (
                    <Link to={`/students/${r.student}`} className="font-medium hover:underline">
                      {r.student_name}
                    </Link>
                  ) : (
                    <span className="font-medium">{r.student_name}</span>
                  )}
                  <p className="font-mono text-xs text-muted-foreground">{r.student_number}</p>
                </div>
                <span className="text-lg font-semibold tabular-nums">{r.points}</span>
                <span className="text-xs text-muted-foreground">pts</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <FormDialog
        open={giving}
        onOpenChange={setGiving}
        wide
        title="Give points by hand"
        description="For things outside an event: helping at the library, a good deed. Use a negative number to correct a mistake."
        submitLabel="Give points"
        schema={schema}
        defaultValues={{ student: null, points: '', reason: '' }}
        onSubmit={async (v) => {
          await award.mutateAsync({ student: v.student!.id, points: Number(v.points), reason: v.reason })
          toast.success(`${Number(v.points) > 0 ? '+' : ''}${v.points} points for ${v.student!.full_name}.`)
        }}
      >
        {({ register, control, formState: { errors } }) => (
          <>
            <FormField label="Student" required error={errors.student?.message}>
              {(p) => <Controller control={control} name="student" render={({ field }) => <StudentPicker {...p} value={field.value} onChange={field.onChange} />} />}
            </FormField>
            <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
              <FormField label="Points" required error={errors.points?.message}>
                <Input {...register('points')} inputMode="numeric" />
              </FormField>
              <FormField label="Reason" required error={errors.reason?.message}>
                <Input {...register('reason')} maxLength={255} />
              </FormField>
            </div>
          </>
        )}
      </FormDialog>
    </>
  )
}
