import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FormField } from '@/components/forms/FormField'
import { SelectControl } from '@/components/forms/SelectControl'
import { CsvImportPage, nameCell } from '@/components/import/CsvImportPage'
import { Checkbox } from '@/components/ui/checkbox'
import { useAcademicYearOptions, useCurrentAcademicYear } from '@/features/academics/academic-years/hooks/useAcademicYears'
import { classKeys } from '@/features/academics/classes/api/classes.api'
import { useClasses } from '@/features/academics/classes/hooks/useClasses'
import { errorMessage } from '@/lib/errors'
import { pluralize } from '@/lib/formatters'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { studentKeys, studentsApi, type StudentInput } from '../api/students.api'
import { STUDENT_COLUMNS } from '../lib/studentImport'
import { tr } from '@/lib/i18n'

interface Placement {
  year: string
  section: string
  allowOver: boolean
}

/** Optionally place everyone in one class: the year, the class (with its seats), and the over-capacity choice. */
function PlacementOptions({ campus, pending, running, value, onChange }: { campus: string; pending: number; running: boolean; value: Placement; onChange: (v: Placement) => void }) {
  const years = useAcademicYearOptions()
  const current = useCurrentAcademicYear()
  const year = value.year || String(current.data?.id ?? years.data?.[0]?.id ?? '')
  const classes = useClasses({ ...PICKER_PARAMS, campus: campus || undefined, academic_year: year || undefined, ordering: 'level' }, { enabled: Boolean(year) })
  const chosen = classes.data?.results.find((c) => String(c.id) === value.section)
  const overflows = chosen?.capacity != null && chosen.student_count + pending > chosen.capacity
  return (
    <>
      <FormField label={tr('Academic year')}>
        {(p) => <SelectControl {...p} value={year} onChange={(v) => onChange({ ...value, year: v, section: '' })} options={(years.data ?? []).map((y) => ({ value: String(y.id), label: y.name }))} disabled={running} />}
      </FormField>
      <FormField label={tr('Place them in class')} description={tr('Optional. Leave empty to place them later.')}>
        {(p) => (
          <SelectControl
            {...p}
            value={value.section}
            onChange={(section) => onChange({ ...value, section })}
            allowEmpty
            emptyLabel={tr('Not now')}
            loading={classes.isLoading}
            disabled={running}
            options={(classes.data?.results ?? []).map((c) => ({ value: String(c.id), label: `${c.display_name} · ${c.capacity != null ? `${c.student_count}/${c.capacity}${c.student_count >= c.capacity ? ' ' + tr('full') : ''}` : pluralize(c.student_count, 'student')}` }))}
          />
        )}
      </FormField>
      {value.section && overflows && (
        <label className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-soft p-3 text-sm sm:col-span-3">
          <Checkbox checked={value.allowOver} onCheckedChange={(c) => onChange({ ...value, allowOver: c === true })} disabled={running} className="mt-0.5" />
          <span>
            <span className="font-medium">{tr('Place anyway, over the class’s seat limit')}</span>
            <span className="block text-xs text-muted-foreground">{tr('The class will have more students than its capacity.')}</span>
          </span>
        </label>
      )}
    </>
  )
}

/** Add a whole class or school from a spreadsheet, and optionally place them in a class. */
export default function StudentImportPage() {
  const qc = useQueryClient()
  const [placement, setPlacement] = useState<Placement>({ year: '', section: '', allowOver: false })
  return (
    <CsvImportPage
      title={tr('Import students')}
      description={tr('Add a whole class or school at once from a spreadsheet. Nothing is saved until you press Import.')}
      backTo="/students"
      done={{ to: '/students', label: tr('See students') }}
      countLabel={(n) => pluralize(n, 'student')}
      fileStem="students"
      columns={STUDENT_COLUMNS}
      example={['2082-001', 'Asha', '', 'Tamang', 'female', '2010-04-13', '', '9800000000', 'Kathmandu', '']}
      preview={[
        { header: tr('Student no.'), className: 'whitespace-nowrap font-mono text-xs', cell: (r) => r.values.student_number || '—' },
        { header: tr('Name'), cell: nameCell },
        { header: tr('Gender'), className: 'hidden md:table-cell', cell: (r) => (r.input.gender as string) ?? '—' },
        { header: tr('Date of birth'), className: 'hidden whitespace-nowrap tabular-nums md:table-cell', cell: (r) => r.values.date_of_birth || '—' },
      ]}
      create={(input, campus) => studentsApi.create({ ...(input as Omit<StudentInput, 'campus'>), campus })}
      linkTo={(id) => `/students/${id}`}
      onFinished={() => {
        void qc.invalidateQueries({ queryKey: studentKeys.all })
        void qc.invalidateQueries({ queryKey: classKeys.all })
      }}
      options={(ctx) => <PlacementOptions {...ctx} value={placement} onChange={setPlacement} />}
      after={
        placement.section
          ? {
              run: async (id) => {
                try {
                  await studentsApi.place(id, { section: Number(placement.section), allow_over_capacity: placement.allowOver })
                  return undefined
                } catch (err) {
                  return errorMessage(err)
                }
              },
              failedLabel: (message) => tr('Not placed in the class: {message}', { message }),
              retryLabel: (count) => tr('Place {count} again', { count: pluralize(count, 'student') }),
            }
          : null
      }
    />
  )
}
