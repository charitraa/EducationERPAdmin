import { ArrowRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ProgramFormDialog } from '@/features/academics/programs/components/ProgramFormDialog'
import { levelLabel } from '@/features/academics/programs/api/programs.api'
import { useProgramOptions } from '@/features/academics/programs/hooks/usePrograms'
import { SubjectFormDialog } from '@/features/academics/subjects/components/SubjectFormDialog'
import { useSubjectOptions } from '@/features/academics/subjects/hooks/useSubjects'
import { useCount } from '@/shared/api/count'
import { MiniList, StepNote } from './StepParts'
import { tr } from '@/lib/i18n'

function CurriculumStatus({ programId }: { programId: number }) {
  const count = useCount('curriculum', '/curriculum/', { program: programId })
  if (count.isPending) return null
  return count.data ? (
    <span className="text-xs text-muted-foreground">{tr('{data} subject entries', { data: count.data })}</span>
  ) : (
    <Link to={`/academics/curriculum?program=${programId}`} className="text-xs font-medium text-primary hover:underline">
      {tr('Set subjects →')}
    </Link>
  )
}

export function ProgramsStep() {
  const programs = useProgramOptions()
  const subjects = useSubjectOptions()
  const [addingProgram, setAddingProgram] = useState(false)
  const [addingSubject, setAddingSubject] = useState(false)

  return (
    <div className="grid gap-4">
      <StepNote>
        {tr('A program is what you teach over several levels, e.g. "+2 Science" (Grade 11–12) or "Grade 1–10". Then add your subjects and choose which level takes which.')}
      </StepNote>
      <div className="grid gap-4 lg:grid-cols-2">
        <MiniList
          title={tr('Programs')}
          loading={programs.isPending}
          empty={tr('No programs yet.')}
          action={
            <Button size="sm" variant="outline" onClick={() => setAddingProgram(true)}>
              <Plus aria-hidden /> {tr('Add')}
            </Button>
          }
          items={(programs.data ?? []).map((p) => (
            <span key={p.id} className="flex items-center justify-between gap-2">
              <span>
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {levelLabel(p, p.first_level ?? 1)}
                  {p.last_level !== p.first_level && `–${p.last_level}`}
                </span>
              </span>
              <CurriculumStatus programId={p.id} />
            </span>
          ))}
        />
        <MiniList
          title={tr('Subjects')}
          loading={subjects.isPending}
          empty={tr('No subjects yet.')}
          action={
            <Button size="sm" variant="outline" onClick={() => setAddingSubject(true)}>
              <Plus aria-hidden /> {tr('Add')}
            </Button>
          }
          items={(subjects.data ?? []).map((s) => (
            <span key={s.id}>
              <span className="mr-2 font-mono text-xs text-muted-foreground">{s.code}</span>
              {s.name}
            </span>
          ))}
        />
      </div>
      {programs.data && programs.data.length > 0 && (
        <div>
          <Button asChild variant="outline">
            <Link to="/academics/curriculum">
              {tr('Choose subjects per level')} <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      )}
      <ProgramFormDialog open={addingProgram} onOpenChange={setAddingProgram} record={null} />
      <SubjectFormDialog open={addingSubject} onOpenChange={setAddingSubject} record={null} />
    </div>
  )
}
