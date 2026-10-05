import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { ClassFormDialog } from '@/features/academics/classes/components/ClassFormDialog'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { MiniList, StepNote } from './StepParts'
import { tr } from '@/lib/i18n'

export function ClassesStep() {
  const current = useCurrentAcademicYear()
  const classes = useClasses({ academic_year: current.data?.id, ordering: 'level', page_size: 200 }, { enabled: Boolean(current.data) })
  const [adding, setAdding] = useState(false)

  if (!current.isPending && !current.data) {
    return <StepNote>{tr('Make an academic year current first (step 2). Classes belong to a year.')}</StepNote>
  }

  return (
    <div className="grid gap-4">
      <StepNote>{tr('Add one class per group of students, e.g. Grade 11 A and Grade 11 B. Students are placed into these.')}</StepNote>
      <MiniList
        title={current.data ? tr('Classes in {name}', { name: current.data.name }) : tr('Classes')}
        loading={current.isPending || classes.isPending}
        empty={tr('No classes yet.')}
        action={
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> {tr('Add class')}
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
