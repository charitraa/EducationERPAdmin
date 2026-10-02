import { useQuery } from '@tanstack/react-query'
import { BookOpen, Layers, Loader2, School } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useDebounce } from '@/hooks/useDebounce'
import { useNavigation } from '@/hooks/useNavigation'
import { usePermissions } from '@/hooks/usePermissions'
import { t } from '@/lib/i18n'
import { PERMS } from '@/shared/constants/permissions'
import { classesApi } from '@/features/academics/classes/api/classes.api'
import { programsApi } from '@/features/academics/programs/api/programs.api'
import { subjectsApi } from '@/features/academics/subjects/api/subjects.api'

interface SearchHit {
  id: string
  label: string
  detail?: string
  to: string
}

/**
 * Server-side search, but only where an endpoint really supports `?search=`
 * and only for what the user may see. There is no global search endpoint, so
 * each source is queried on its own.
 */
const SOURCES = [
  {
    key: 'programs',
    heading: 'Programs',
    icon: Layers,
    permission: PERMS.academics.view,
    search: (q: string): Promise<SearchHit[]> =>
      programsApi.list({ search: q, page_size: 5 }).then((p) => p.results.map((r) => ({ id: `p${r.id}`, label: r.name, detail: r.code, to: `/academics/programs?search=${encodeURIComponent(r.name)}` }))),
  },
  {
    key: 'subjects',
    heading: 'Subjects',
    icon: BookOpen,
    permission: PERMS.academics.view,
    search: (q: string): Promise<SearchHit[]> =>
      subjectsApi.list({ search: q, page_size: 5 }).then((p) => p.results.map((r) => ({ id: `s${r.id}`, label: r.name, detail: r.code, to: `/academics/subjects?search=${encodeURIComponent(r.code)}` }))),
  },
  {
    key: 'classes',
    heading: 'Classes',
    icon: School,
    permission: PERMS.academics.view,
    search: (q: string): Promise<SearchHit[]> =>
      classesApi.list({ search: q, page_size: 5 }).then((p) =>
        p.results.map((r) => ({ id: `c${r.id}`, label: r.display_name, detail: `${r.program_name} · ${r.academic_year_name}`, to: `/academics/classes?search=${encodeURIComponent(r.name)}&academic_year=${r.academic_year}` })),
      ),
  },
]

function SourceResults({ source, query, onPick }: { source: (typeof SOURCES)[number]; query: string; onPick: (to: string) => void }) {
  const results = useQuery({ queryKey: ['command-search', source.key, query], queryFn: () => source.search(query), enabled: query.length >= 2, staleTime: 30_000 })
  if (query.length < 2) return null
  if (results.isPending) {
    return (
      <CommandGroup heading={source.heading}>
        <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Searching…
        </div>
      </CommandGroup>
    )
  }
  if (!results.data?.length) return null
  return (
    <CommandGroup heading={source.heading}>
      {results.data.map((hit) => (
        <CommandItem key={hit.id} value={hit.id} onSelect={() => onPick(hit.to)}>
          <source.icon className="text-muted-foreground" aria-hidden />
          <span className="flex-1">{hit.label}</span>
          {hit.detail && <span className="text-xs text-muted-foreground">{hit.detail}</span>}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [text, setText] = useState('')
  const query = useDebounce(text.trim(), 250)
  const sections = useNavigation()
  const { can } = usePermissions()
  const navigate = useNavigate()

  const pages = useMemo(() => {
    const q = text.trim().toLowerCase()
    return sections
      .flatMap((s) => s.items.map((i) => ({ ...i, section: t(s.label), name: t(i.label) })))
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.section.toLowerCase().includes(q))
  }, [sections, text])

  const pick = (to: string) => {
    onOpenChange(false)
    setText('')
    navigate(to)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (onOpenChange(o), o || setText(''))}>
      <DialogContent className="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-item]]:gap-2.5 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2">
          <CommandInput value={text} onValueChange={setText} placeholder="Go to a page, or search programs, subjects, classes…" />
          <CommandList className="max-h-[60vh]">
            <CommandEmpty>Nothing found.</CommandEmpty>
            {pages.length > 0 && (
              <CommandGroup heading="Go to">
                {pages.map((p) => (
                  <CommandItem key={p.path} value={`page:${p.path}`} onSelect={() => pick(p.path)}>
                    <p.icon className="text-muted-foreground" aria-hidden />
                    <span className="flex-1">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.section}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {SOURCES.filter((s) => can(s.permission)).map((s) => (
              <SourceResults key={s.key} source={s} query={query} onPick={pick} />
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
