import {
  Award,
  BarChart3,
  BedDouble,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  Bus,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileBadge,
  FileStack,
  GraduationCap,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  Megaphone,
  MessagesSquare,
  PartyPopper,
  Receipt,
  ScrollText,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserCog,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  Wand2,
} from 'lucide-react'
import type { PermissionRequirement } from '@/lib/permissions'
import type { MessageKey } from '@/locales/en'

export interface NavItem {
  label: MessageKey
  path: string
  icon: LucideIcon
  /** Omit for screens everyone may open (the server still filters the data). */
  permission?: PermissionRequirement
  /** `planned`: the module's screens aren't built yet; the route shows a placeholder. */
  status?: 'ready' | 'planned'
}

export interface NavSection {
  label: MessageKey
  items: NavItem[]
}

/**
 * The sidebar, Ctrl+K and the route guards all read from here. Permission codes
 * follow docs/frontend-brief.md §5. Menus are filtered by `me.permissions`;
 * routes enforce the same requirement, so hiding is never the only guard.
 */
export const navigation: NavSection[] = [
  {
    label: 'nav.section.main',
    items: [{ label: 'nav.dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    label: 'nav.section.academic',
    items: [
      { label: 'nav.students', path: '/students', icon: GraduationCap, permission: 'students.view' },
      { label: 'nav.admissions', path: '/admissions', icon: ClipboardList, permission: 'admissions.view', status: 'planned' },
      { label: 'nav.parents', path: '/parents', icon: UsersRound, permission: 'parents.view', status: 'planned' },
      { label: 'nav.staff', path: '/staff', icon: UserRound, permission: 'staff.view', status: 'planned' },
      { label: 'nav.academics', path: '/academics', icon: BookOpen, permission: 'academics.view' },
      { label: 'nav.timetable', path: '/timetable', icon: CalendarClock, permission: 'timetable.view', status: 'planned' },
      { label: 'nav.attendance', path: '/attendance', icon: CalendarCheck, permission: { any: ['attendance.view', 'attendance.mark'] }, status: 'planned' },
      { label: 'nav.examinations', path: '/examinations', icon: ClipboardCheck, permission: { any: ['exams.view', 'exams.mark'] }, status: 'planned' },
    ],
  },
  {
    label: 'nav.section.finance',
    items: [
      { label: 'nav.fees', path: '/finance', icon: Wallet, permission: { any: ['finance.view', 'finance.collect'] }, status: 'planned' },
      { label: 'nav.payments', path: '/finance/payments', icon: Receipt, permission: { any: ['finance.view', 'finance.collect'] }, status: 'planned' },
      { label: 'nav.scholarships', path: '/finance/scholarships', icon: HandCoins, permission: 'finance.view', status: 'planned' },
    ],
  },
  {
    label: 'nav.section.campusLife',
    items: [
      { label: 'nav.events', path: '/events', icon: PartyPopper, permission: 'events.view', status: 'planned' },
      { label: 'nav.notices', path: '/notices', icon: Megaphone, status: 'planned' },
      { label: 'nav.messages', path: '/messages', icon: MessagesSquare, status: 'planned' },
      { label: 'nav.support', path: '/support', icon: LifeBuoy, status: 'planned' },
      { label: 'nav.library', path: '/library', icon: BookOpen, permission: { any: ['library.circulate', 'library.manage'] }, status: 'planned' },
      { label: 'nav.inventory', path: '/inventory', icon: Boxes, permission: 'inventory.view', status: 'planned' },
    ],
  },
  {
    label: 'nav.section.operations',
    items: [
      { label: 'nav.hr', path: '/hr', icon: Briefcase, permission: 'hr.view', status: 'planned' },
      { label: 'nav.payroll', path: '/payroll', icon: BarChart3, permission: 'payroll.view', status: 'planned' },
      { label: 'nav.hostel', path: '/hostel', icon: BedDouble, permission: 'hostel.view', status: 'planned' },
      { label: 'nav.transport', path: '/transport', icon: Bus, permission: 'transport.view', status: 'planned' },
      { label: 'nav.applications', path: '/applications', icon: FileStack, permission: 'applications.view', status: 'planned' },
      { label: 'nav.certificates', path: '/certificates', icon: FileBadge, permission: { any: ['applications.view', 'applications.certify'] }, status: 'planned' },
    ],
  },
  {
    label: 'nav.section.community',
    items: [
      { label: 'nav.alumni', path: '/alumni', icon: Award, permission: 'alumni.view', status: 'planned' },
      { label: 'nav.careers', path: '/careers', icon: Sparkles, permission: 'careers.view', status: 'planned' },
    ],
  },
  {
    label: 'nav.section.administration',
    items: [
      { label: 'nav.users', path: '/users', icon: Users, permission: 'users.view', status: 'planned' },
      { label: 'nav.roles', path: '/roles', icon: ShieldCheck, permission: 'roles.view', status: 'planned' },
      { label: 'nav.apiKeys', path: '/settings/api-keys', icon: KeyRound, permission: 'api_keys.manage', status: 'planned' },
      { label: 'nav.audit', path: '/audit', icon: ScrollText, permission: 'audit.view', status: 'planned' },
    ],
  },
  {
    label: 'nav.section.settings',
    items: [
      { label: 'nav.organization', path: '/settings/organization', icon: Building2, permission: 'organizations.view' },
      { label: 'nav.branches', path: '/settings/branches', icon: Settings2, permission: 'campuses.view' },
      {
        label: 'nav.templates',
        path: '/settings/templates',
        icon: UserCog,
        permission: { any: ['grades.manage', 'finance.manage', 'hr.manage', 'applications.manage'] },
        status: 'planned',
      },
      { label: 'nav.setup', path: '/settings/setup', icon: Wand2, permission: 'organizations.update' },
    ],
  },
]

export const allNavItems = navigation.flatMap((s) => s.items)

/** The nav item a path belongs to (longest matching prefix), for breadcrumbs and guards. */
export function navItemFor(pathname: string): NavItem | undefined {
  return allNavItems
    .filter((i) => (i.path === '/' ? pathname === '/' : pathname === i.path || pathname.startsWith(`${i.path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0]
}
