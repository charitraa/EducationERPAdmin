import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { ClassFormDialog } from '@/features/academics/classes/components/ClassFormDialog'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { MiniList, StepNote } from './StepParts'

export function ClassesStep() {
  const current = useCurrentAcademicYear()
  const classes = useClasses({ academic_year: current.data?.id, ordering: 'level', page_size: 200 }, { enabled: Boolean(current.data) })
  const [adding, setAdding] = useState(false)

  if (!current.isPending && !current.data) {
    return <StepNote>Make an academic year current first (step 2). Classes belong to a year.</StepNote>
  }

  return (
    <div className="grid gap-4">
      <StepNote>Add one class per group of students, e.g. Grade 11 A and Grade 11 B. Students are placed into these.</StepNote>
      <MiniList
        title={current.data ? `Classes in ${current.data.name}` : 'Classes'}
        loading={current.isPending || classes.isPending}
        empty="No classes yet."
        action={
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Add class
          </Button>
        }
        items={(classes.data?.results ?? []).map((c) => (
          <span key={c.id} className="flex justify-between gap-2">
            <span className="font-medium">{c.display_name}</span>
            <span className="text-xs text-muted-foreground">{c.program_name}</span>
          </span>
        ))}
      />
      <ClassFormDialog open={adding} onOpenChange={setAdding} record={null} />
    </div>
  )
}
