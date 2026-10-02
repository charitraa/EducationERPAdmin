import { Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/useToast'
import { formatDate } from '@/lib/dates'
import { AcademicYearFormDialog } from '@/features/academics/academic-years/components/AcademicYearFormDialog'
import { useAcademicYearOptions, useSetCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { TermFormDialog } from '@/features/academics/terms/components/TermFormDialog'
import { useTerms } from '@/features/academics/terms/hooks/useTerms'
import { MiniList, StepNote } from './StepParts'

export function YearStep() {
  const years = useAcademicYearOptions()
  const setCurrent = useSetCurrentAcademicYear()
  const current = years.data?.find((y) => y.is_current) ?? null
  const terms = useTerms({ academic_year: current?.id, ordering: 'sequence', page_size: 50 }, { enabled: Boolean(current) })
  const [addingYear, setAddingYear] = useState(false)
  const [addingTerm, setAddingTerm] = useState(false)

  return (
    <div className="grid gap-4">
      <StepNote>Name the year the way your school does: 2082/83 (BS) or 2026-27. Dates are entered in AD; the BS date is shown alongside.</StepNote>
      <MiniList
        title="Academic years"
        loading={years.isPending}
        empty="No academic year yet."
        action={
          <Button size="sm" variant="outline" onClick={() => setAddingYear(true)}>
            <Plus aria-hidden /> Add year
          </Button>
        }
        items={(years.data ?? []).map((y) => (
          <span key={y.id} className="flex items-center justify-between gap-2">
            <span>
              <span className="font-medium">{y.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {formatDate(y.start_date)} → {formatDate(y.end_date)}
              </span>
            </span>
            {y.is_current ? (
              <StatusBadge status="current" label="Current" />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCurrent.mutate(y.id, { onSuccess: () => toast.success(`${y.name} is now the current year.`) })}
              >
                <Star aria-hidden /> Make current
              </Button>
            )}
          </span>
        ))}
      />
      {years.data && years.data.length > 0 && !current && <StepNote>Make one year current: it becomes the default for classes, fees and exams.</StepNote>}
      {current && (
        <MiniList
          title={`Terms in ${current.name}`}
          loading={terms.isPending}
          empty="No terms yet. Add them if you hold exams or bill fees by term."
          action={
            <Button size="sm" variant="outline" onClick={() => setAddingTerm(true)}>
              <Plus aria-hidden /> Add term
            </Button>
          }
          items={(terms.data?.results ?? []).map((t) => (
            <span key={t.id}>
              {t.sequence}. <span className="font-medium">{t.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {formatDate(t.start_date)} → {formatDate(t.end_date)}
              </span>
            </span>
          ))}
        />
      )}
      <AcademicYearFormDialog open={addingYear} onOpenChange={setAddingYear} record={null} />
      <TermFormDialog open={addingTerm} onOpenChange={setAddingTerm} record={null} defaultAcademicYear={current?.id} nextSequence={(terms.data?.count ?? 0) + 1} />
    </div>
  )
}
