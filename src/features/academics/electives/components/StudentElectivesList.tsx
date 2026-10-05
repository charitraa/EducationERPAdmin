import { Link } from 'react-router-dom'
import type { Id } from '@/shared/types/api'
import { tr } from '@/lib/i18n'
import { useStudentElectives } from '../hooks/useElectives'

/** The electives a student takes in one class, with a link to that class's electives grid. */
export function StudentElectivesList({ student, section }: { student: Id; section: Id }) {
  const choices = useStudentElectives(student)
  if (choices.isPending) return <span className="text-muted-foreground">…</span>
  if (choices.isError) return <span className="text-muted-foreground">{tr('Couldn’t load')}</span>
  const names = choices.data.results.filter((c) => c.section === section && !c.ended_on).map((c) => c.subject_name)
  return (
    <>
      {names.length ? names.join(', ') : <span className="text-muted-foreground">{tr('None recorded')}</span>}{' '}
      <Link to={`/academics/electives?section=${section}`} className="text-xs text-primary hover:underline">
        {names.length ? tr('Change') : tr('Choose')}
      </Link>
    </>
  )
}
