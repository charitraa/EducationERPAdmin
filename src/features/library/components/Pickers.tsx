import { Check, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Spinner } from '@/components/data-display/LoadingState'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/lib/utils'
import type { Id } from '@/shared/types/api'
import type { Copy, Loan, Member } from '../api/library.api'
import { useCopies, useLoans, useMembers } from '../hooks/useLibrary'

interface PickerProps<T> {
  value: T | null
  onChange: (value: T | null) => void
  id?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** Search the server as you type; pick one row. Shared shape for members, copies and loans. */
function SearchPicker<T extends { id: Id }>({
  value,
  onChange,
  id,
  placeholder,
  noun,
  plural = `${noun}s`,
  minLength = 1,
  useResults,
  render,
  selectedLabel,
  ...aria
}: PickerProps<T> & {
  placeholder: string
  noun: string
  plural?: string
  minLength?: number
  useResults: (term: string, enabled: boolean) => { isPending: boolean; isError: boolean; data?: { results: T[] } }
  render: (row: T) => ReactNode
  selectedLabel: (row: T) => string
}) {
  const [search, setSearch] = useState('')
  const term = useDebounce(search.trim())
  const results = useResults(term, term.length >= minLength)
  const listId = `${id ?? noun}-results`
  return (
    <div className="grid gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input id={id} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={placeholder} className="pl-9" autoComplete="off" aria-controls={listId} {...aria} />
      </div>
      <div id={listId} role="listbox" aria-label={`Matching ${plural}`} className="max-h-56 overflow-y-auto rounded-md border">
        {term.length < minLength ? (
          <p className="p-3 text-sm text-muted-foreground">{value ? `Selected: ${selectedLabel(value)}` : `Type to find a ${noun}.`}</p>
        ) : results.isPending ? (
          <div className="p-3">
            <Spinner />
          </div>
        ) : results.isError ? (
          <p className="p-3 text-sm text-danger">Couldn’t search.</p>
        ) : (results.data?.results.length ?? 0) === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">No {noun} matches “{term}”.</p>
        ) : (
          results.data!.results.map((row) => {
            const selected = value?.id === row.id
            return (
              <button
                key={row.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onChange(selected ? null : row)}
                className={cn('flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50', selected && 'bg-accent')}
              >
                <span className="min-w-0 flex-1">{render(row)}</span>
                {selected && <Check className="h-4 w-4 text-primary" aria-hidden />}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export function MemberPicker(props: PickerProps<Member>) {
  return (
    <SearchPicker
      {...props}
      noun="member"
      placeholder="Name, member or student no.…"
      useResults={(term, enabled) => useMembers({ search: term, is_active: true, page_size: 8 }, enabled)}
      selectedLabel={(m) => `${m.full_name} (${m.member_number})`}
      render={(m) => (
        <>
          <span className="block font-medium">{m.full_name}</span>
          <span className="block text-xs text-muted-foreground">
            <span className="font-mono">{m.member_number}</span> · {m.active_issues}/{m.max_books ?? '?'} books out
          </span>
        </>
      )}
    />
  )
}

/** Copies on the shelf, found by accession number, title or ISBN. */
export function CopyPicker(props: PickerProps<Copy>) {
  return (
    <SearchPicker
      {...props}
      noun="copy"
      plural="copies"
      placeholder="Accession no., title or ISBN…"
      useResults={(term, enabled) => useCopies({ search: term, status: 'available', page_size: 8 }, enabled)}
      selectedLabel={(c) => `${c.book_title} (${c.accession_number})`}
      render={(c) => (
        <>
          <span className="block font-medium">{c.book_title}</span>
          <span className="block text-xs text-muted-foreground">
            <span className="font-mono">{c.accession_number}</span>
            {c.shelf_name ? ` · ${c.shelf_name}` : ''}
          </span>
        </>
      )}
    />
  )
}

/** Books out on loan, found by accession number, title or member number. */
export function LoanPicker(props: PickerProps<Loan>) {
  return (
    <SearchPicker
      {...props}
      noun="loan"
      placeholder="Accession no., title or member no.…"
      useResults={(term, enabled) => useLoans({ search: term, status: 'issued', page_size: 8 }, enabled)}
      selectedLabel={(l) => `${l.book_title} (${l.accession_number}) — ${l.member_name}`}
      render={(l) => (
        <>
          <span className="block font-medium">
            {l.book_title} <span className="font-mono text-xs font-normal">{l.accession_number}</span>
          </span>
          <span className={cn('block text-xs', l.is_overdue ? 'text-danger' : 'text-muted-foreground')}>
            {l.member_name} · due {l.due_at.slice(0, 10)}
            {l.is_overdue ? ' · overdue' : ''}
          </span>
        </>
      )}
    />
  )
}
