import { BookOpen, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/data-display/EmptyState'
import { ErrorState } from '@/components/data-display/ErrorState'
import { CardSkeleton } from '@/components/data-display/LoadingState'
import { SelectControl } from '@/components/forms/SelectControl'
import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/usePermissions'
import { toast } from '@/hooks/useToast'
import { PERMS } from '@/shared/constants/permissions'
import { SectionHeader } from '../../components/SectionHeader'
import { levelLabel, programLevels } from '../../programs/api/programs.api'
import { useProgramOptions } from '../../programs/hooks/usePrograms'
import { useSubjectOptions } from '../../subjects/hooks/useSubjects'
import type { CurriculumEntry } from '../api/curriculum.api'
import { AddSubjectsDialog } from '../components/AddSubjectsDialog'
import { useProgramCurriculum, useRemoveCurriculumEntry, useUpdateCurriculumEntry } from '../hooks/useCurriculum'

/**
 * Which subjects each level of a program takes, shown as one card per level
 * rather than a flat list of rows: the way a school thinks about it.
 */
export default function CurriculumPage() {
  const [params, setParams] = useSearchParams()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission(PERMS.academics.structure)
  const programs = useProgramOptions()
  const subjects = useSubjectOptions()
  const programId = Number(params.get('program')) || programs.data?.[0]?.id || null
  const program = programs.data?.find((p) => p.id === programId)
  const curriculum = useProgramCurriculum(programId)
  const update = useUpdateCurriculumEntry()
  const remove = useRemoveCurriculumEntry()
  const [adding, setAdding] = useState<number | null>(null)
  const [removing, setRemoving] = useState<CurriculumEntry | null>(null)

  const byLevel = useMemo(() => {
    const map = new Map<number, CurriculumEntry[]>()
    for (const e of curriculum.data?.results ?? []) map.set(e.level, [...(map.get(e.level) ?? []), e])
    return map
  }, [curriculum.data])

  if (programs.isPending) return <CardSkeleton className="h-40" />
  if (programs.isError) return <ErrorState error={programs.error} onRetry={() => void programs.refetch()} />
  if (!programs.data.length) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Add a program first"
        description="The curriculum says which subjects each level of a program takes."
        action={
          <Button asChild variant="outline">
            <Link to="/academics/programs">Go to Programs</Link>
          </Button>
        }
      />
    )
  }

  const levels = programLevels(program)

  return (
    <>
      <SectionHeader
        title="Curriculum"
        description="The subjects each level takes. Electives are the ones students choose between."
        action={
          <div className="w-full sm:w-64">
            <SelectControl
              aria-describedby={undefined}
              value={programId ? String(programId) : ''}
              onChange={(v) => setParams({ program: v }, { replace: true })}
              options={programs.data.map((p) => ({ value: String(p.id), label: p.name }))}
              placeholder="Choose a program"
            />
          </div>
        }
      />
      {curriculum.isError ? (
        <ErrorState error={curriculum.error} onRetry={() => void curriculum.refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {levels.map((level) => {
            const entries = byLevel.get(level) ?? []
            const taken = new Set(entries.map((e) => e.subject))
            const name = levelLabel(program, level)
            return (
              <section key={level} className="rounded-lg border bg-card" aria-label={name}>
                <header className="flex items-center justify-between border-b px-4 py-2.5">
                  <div>
                    <h3 className="text-sm font-semibold">{name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {entries.length} subject{entries.length === 1 ? '' : 's'}
                      {entries.some((e) => e.is_elective) && ` · ${entries.filter((e) => e.is_elective).length} elective`}
                    </p>
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => setAdding(level)} disabled={!subjects.data?.length}>
                      <Plus aria-hidden /> Add
                    </Button>
                  )}
                </header>
                {curriculum.isPending ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading…</div>
                ) : entries.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {subjects.data?.length === 0 ? (
                      <>
                        No subjects exist yet. <Link className="font-medium text-primary underline-offset-2 hover:underline" to="/academics/subjects">Add subjects</Link>
                      </>
                    ) : (
                      'No subjects for this level yet.'
                    )}
                  </p>
                ) : (
                  <ul className="divide-y">
                    {entries.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                        <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{e.subject_code}</span>
                        <span className="flex-1">{e.subject_name}</span>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => update.mutate({ id: e.id, input: { is_elective: !e.is_elective } })}
                            className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                            title="Switch between core and elective"
                          >
                            {e.is_elective ? 'Elective' : 'Core'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">{e.is_elective ? 'Elective' : 'Core'}</span>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRemoving(e)} aria-label={`Remove ${e.subject_name} from ${name}`}>
                            <X />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {adding === level && programId && (
                  <AddSubjectsDialog
                    open
                    onOpenChange={(o) => !o && setAdding(null)}
                    program={programId}
                    level={level}
                    levelName={name}
                    available={(subjects.data ?? []).filter((s) => !taken.has(s.id))}
                  />
                )}
              </section>
            )
          })}
        </div>
      )}
      {removing && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setRemoving(null)}
          title={`Remove ${removing.subject_name} from ${removing.level_label}?`}
          description="The subject itself stays; only this level stops taking it."
          confirmLabel="Remove"
          tone="destructive"
          onConfirm={async () => {
            await remove.mutateAsync(removing.id)
            toast.success('Removed from the curriculum.')
          }}
        />
      )}
    </>
  )
}
