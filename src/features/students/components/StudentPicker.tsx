import { Check, Search } from 'lucide-react'
import { useState } from 'react'
import { Spinner } from '@/components/data-display/LoadingState'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import type { Id } from '@/shared/types/api'
import { currentEnrollment, type Student } from '../api/students.api'
import { useStudents } from '../hooks/useStudents'

interface StudentPickerProps {
  value: Student | null
  onChange: (student: Student | null) => void
  /** Already linked, already chosen elsewhere… shown but not selectable. */
  exclude?: readonly Id[]
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Find one student by name, number, phone or email. Schools have thousands,
 * so this searches the server instead of loading a dropdown.
 */
export function StudentPicker({ value, onChange, exclude = [], id, ...aria }: StudentPickerProps) {
  const [search, setSearch] = useState('')
  const term = useDebounce(search.trim())
  const results = useStudents({ search: term, page_size: 8, ordering: 'first_name' }, { enabled: term.length >= 2 })
  const listId = `${id ?? 'student-picker'}-results`

  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={id}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type a name or student no.…"
          className="pl-9"
          autoComplete="off"
          aria-controls={listId}
          {...aria}
        />
      </div>
      <div id={listId} role="listbox" aria-label="Matching students" className="max-h-60 overflow-y-auto rounded-md border">
        {term.length < 2 ? (
          <p className="p-3 text-sm text-muted-foreground">{value ? `Selected: ${value.full_name} (${value.student_number})` : 'Type at least 2 letters to search.'}</p>
        ) : results.isPending ? (
          <div className="p-3">
            <Spinner />
          </div>
        ) : results.isError ? (
          <p className="p-3 text-sm text-danger">Couldn’t search students.</p>
        ) : results.data.results.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No student matches “{term}”.</p>
        ) : (
          results.data.results.map((s) => {
            const excluded = exclude.includes(s.id)
            const selected = value?.id === s.id
            const cls = currentEnrollment(s)?.section_name
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={excluded}
                onClick={() => onChange(selected ? null : s)}
                className={cn(
                  'flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50',
                  selected && 'bg-accent',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{s.full_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    <span className="font-mono">{s.student_number}</span>
                    {cls ? ` · ${cls}` : ''}
                    {excluded ? ' · already linked' : ''}
                  </span>
                </span>
                {selected && <Check className="h-4 w-4 text-primary" aria-hidden />}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
