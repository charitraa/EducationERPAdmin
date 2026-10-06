import { useQueries } from '@tanstack/react-query'
import { Backpack, BookOpen, Briefcase, ClipboardList, FileStack, GraduationCap, Layers, Library, Loader2, Package, Receipt, School, UserRound, Users, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useDebounce } from '@/hooks/useDebounce'
import { useNavigation } from '@/hooks/useNavigation'
import { usePermissions } from '@/hooks/usePermissions'
import { t, tr } from '@/lib/i18n'
import type { PermissionRequirement } from '@/lib/permissions'
import { PERMS } from '@/shared/constants/permissions'
import { admissionsApi } from '@/features/admissions/api/admissions.api'
import { profilesApi as alumniApi } from '@/features/alumni/api/alumni.api'
import { applicationsApi } from '@/features/applications/api/applications.api'
import { candidaciesApi } from '@/features/careers/api/careers.api'
import { invoicesApi, receiptsApi } from '@/features/finance/api/finance.api'
import { assetsApi } from '@/features/inventory/api/inventory.api'
import { booksApi } from '@/features/library/api/library.api'
import { parentsApi } from '@/features/parents/api/parents.api'
import { staffApi } from '@/features/staff/api/staff.api'
import { studentsApi } from '@/features/students/api/students.api'
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
const PAGE = { page_size: 5 }
const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(' · ') || undefined

const SOURCES: Array<{ key: string; heading: string; icon: typeof Layers; permission: PermissionRequirement; search: (q: string) => Promise<SearchHit[]> }> = [
  {
    key: 'students',
    heading: tr('Students'),
    icon: GraduationCap,
    permission: PERMS.students.view,
    search: (q) => studentsApi.list({ search: q, ...PAGE }).then((p) => p.results.map((r) => ({ id: `st${r.id}`, label: r.full_name, detail: join(r.student_number, r.campus_name), to: `/students/${r.id}` }))),
  },
  {
    key: 'staff',
    heading: tr('Staff'),
    icon: UserRound,
    permission: PERMS.staff.view,
    search: (q) => staffApi.list({ search: q, ...PAGE }).then((p) => p.results.map((r) => ({ id: `sf${r.id}`, label: r.full_name, detail: join(r.employee_number, r.designation), to: `/staff/${r.id}` }))),
  },
  {
    key: 'parents',
    heading: tr('Parents'),
    icon: Users,
    permission: PERMS.parents.view,
    search: (q) => parentsApi.list({ search: q, ...PAGE }).then((p) => p.results.map((r) => ({ id: `pa${r.id}`, label: r.full_name, detail: join(r.phone), to: `/parents/${r.id}` }))),
  },
  {
    key: 'admissions',
    heading: tr('Admissions'),
    icon: ClipboardList,
    permission: PERMS.admissions.view,
    search: (q) => admissionsApi.list({ search: q, ...PAGE }).then((p) => p.results.map((r) => ({ id: `ad${r.id}`, label: r.full_name, detail: r.application_number, to: `/admissions/${r.id}` }))),
  },
  {
    key: 'alumni',
    heading: tr('Alumni'),
    icon: Backpack,
    permission: PERMS.alumni.view,
    search: (q) => alumniApi.list({ search: q, ...PAGE }).then((p) => p.results.map((r) => ({ id: `al${r.id}`, label: r.full_name, detail: join(r.program_name, r.graduated_on?.slice(0, 4)), to: `/alumni/${r.id}` }))),
  },
  {
    key: 'applications',
    heading: tr('Applications'),
    icon: FileStack,
    permission: PERMS.applications.view,
    search: (q) => applicationsApi.list({ search: q, ...PAGE }).then((p) => p.results.map((r) => ({ id: `ap${r.id}`, label: r.number, detail: join(r.type_name, r.subject_name || r.contact_name), to: `/applications/${r.id}` }))),
  },
  {
    key: 'invoices',
    heading: tr('Invoices'),
    icon: Wallet,
    permission: PERMS.finance.view,
    search: (q) => invoicesApi.list({ search: q, ...PAGE }).then((p) => p.results.map((r) => ({ id: `in${r.id}`, label: r.invoice_number, detail: r.student_name, to: `/finance/invoices/${r.id}` }))),
  },
  {
    key: 'receipts',
    heading: tr('Receipts'),
    icon: Receipt,
    permission: PERMS.finance.view,
    search: (q) => receiptsApi.list({ search: q, ...PAGE }).then((p) => p.results.map((r) => ({ id: `rc${r.id}`, label: r.receipt_number, detail: r.student_name, to: `/finance/payments/${r.payment}` }))),
  },
  {
    key: 'candidates',
    heading: tr('Candidates'),
    icon: Briefcase,
    permission: PERMS.careers.view,
    search: (q) => candidaciesApi.list({ search: q, ...PAGE }).then((p) => p.results.map((r) => ({ id: `ca${r.id}`, label: r.full_name, detail: r.vacancy_title, to: `/careers/applications/${r.id}` }))),
  },
  {
    key: 'books',
    heading: tr('Books'),
    icon: Library,
    permission: { any: [PERMS.library.circulate, PERMS.library.manage] },
    search: (q) => booksApi.list({ search: q, ...PAGE }).then((p) => p.results.map((r) => ({ id: `bk${r.id}`, label: r.title, detail: join(r.author_names.join(', ')), to: `/library/books/${r.id}` }))),
  },
  {
    key: 'assets',
    heading: tr('Assets'),
    icon: Package,
    permission: PERMS.inventory.view,
    search: (q) => assetsApi.list({ search: q, ...PAGE }).then((p) => p.results.map((r) => ({ id: `as${r.id}`, label: r.tag, detail: r.item_name, to: `/inventory/assets/${r.id}` }))),
  },
  {
    key: 'programs',
    heading: tr('Programs'),
    icon: Layers,
    permission: PERMS.academics.view,
    search: (q: string): Promise<SearchHit[]> =>
      programsApi.list({ search: q, page_size: 5 }).then((p) => p.results.map((r) => ({ id: `p${r.id}`, label: r.name, detail: r.code, to: `/academics/programs?search=${encodeURIComponent(r.name)}` }))),
  },
  {
    key: 'subjects',
    heading: tr('Subjects'),
    icon: BookOpen,
    permission: PERMS.academics.view,
    search: (q: string): Promise<SearchHit[]> =>
      subjectsApi.list({ search: q, page_size: 5 }).then((p) => p.results.map((r) => ({ id: `s${r.id}`, label: r.name, detail: r.code, to: `/academics/subjects?search=${encodeURIComponent(r.code)}` }))),
  },
  {
    key: 'classes',
    heading: tr('Classes'),
    icon: School,
    permission: PERMS.academics.view,
    search: (q: string): Promise<SearchHit[]> =>
      classesApi.list({ search: q, page_size: 5 }).then((p) =>
        p.results.map((r) => ({ id: `c${r.id}`, label: r.display_name, detail: `${r.program_name} · ${r.academic_year_name}`, to: `/academics/classes?search=${encodeURIComponent(r.name)}&academic_year=${r.academic_year}` })),
      ),
  },
]

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

  const sources = SOURCES.filter((s) => can(s.permission))
  const searching = query.length >= 2
  const results = useQueries({
    queries: sources.map((source) => ({ queryKey: ['command-search', source.key, query], queryFn: () => source.search(query), enabled: searching, staleTime: 30_000 })),
  })
  const pending = searching && results.some((r) => r.isPending)
  const hits = searching ? results.reduce((n, r) => n + (r.data?.length ?? 0), 0) : 0

  const pick = (to: string) => {
    onOpenChange(false)
    setText('')
    navigate(to)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (onOpenChange(o), o || setText(''))}>
      <DialogContent className="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">{tr('Search')}</DialogTitle>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-item]]:gap-2.5 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2">
          <CommandInput value={text} onValueChange={setText} placeholder={tr('Go to a page, or search people, applications, invoices…')} />
          <CommandList className="max-h-[60vh]">
            {pages.length === 0 && !pending && hits === 0 && <p className="py-6 text-center text-sm">{tr('Nothing found.')}</p>}
            {pages.length > 0 && (
              <CommandGroup heading={tr('Go to')}>
                {pages.map((p) => (
                  <CommandItem key={p.path} value={`page:${p.path}`} onSelect={() => pick(p.path)}>
                    <p.icon className="text-muted-foreground" aria-hidden />
                    <span className="flex-1">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.section}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {searching &&
              sources.map((source, i) =>
                results[i]?.data?.length ? (
                  <CommandGroup key={source.key} heading={source.heading}>
                    {results[i].data.map((hit) => (
                      <CommandItem key={hit.id} value={hit.id} onSelect={() => pick(hit.to)}>
                        <source.icon className="text-muted-foreground" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{hit.label}</span>
                        {hit.detail && <span className="max-w-[45%] truncate text-xs text-muted-foreground">{hit.detail}</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null,
              )}
            {pending && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground" role="status">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> {tr('Searching…')}
              </div>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
