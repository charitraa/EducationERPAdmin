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
  CircleUserRound,
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
    items: [
      { label: 'nav.dashboard', path: '/', icon: LayoutDashboard },
      { label: 'nav.me', path: '/me', icon: CircleUserRound },
    ],
  },
  {
    label: 'nav.section.academic',
    items: [
      { label: 'nav.students', path: '/students', icon: GraduationCap, permission: 'students.view' },
      { label: 'nav.admissions', path: '/admissions', icon: ClipboardList, permission: 'admissions.view' },
      { label: 'nav.parents', path: '/parents', icon: UsersRound, permission: 'parents.view' },
      { label: 'nav.staff', path: '/staff', icon: UserRound, permission: 'staff.view' },
      { label: 'nav.academics', path: '/academics', icon: BookOpen, permission: 'academics.view' },
      { label: 'nav.timetable', path: '/timetable', icon: CalendarClock, permission: 'timetable.view' },
      { label: 'nav.attendance', path: '/attendance', icon: CalendarCheck, permission: { any: ['attendance.view', 'attendance.mark'] } },
      { label: 'nav.examinations', path: '/examinations', icon: ClipboardCheck, permission: { any: ['exams.view', 'exams.mark'] } },
    ],
  },
  {
    label: 'nav.section.finance',
    items: [
      { label: 'nav.fees', path: '/finance', icon: Wallet, permission: 'finance.view' },
      { label: 'nav.payments', path: '/finance/payments', icon: Receipt, permission: 'finance.view' },
      { label: 'nav.scholarships', path: '/finance/scholarships', icon: HandCoins, permission: 'finance.view' },
    ],
  },
  {
    label: 'nav.section.campusLife',
    items: [
      { label: 'nav.events', path: '/events', icon: PartyPopper, permission: 'events.view' },
      { label: 'nav.notices', path: '/notices', icon: Megaphone },
      { label: 'nav.messages', path: '/messages', icon: MessagesSquare },
      { label: 'nav.support', path: '/support', icon: LifeBuoy },
      { label: 'nav.library', path: '/library', icon: BookOpen, permission: { any: ['library.circulate', 'library.manage'] } },
      { label: 'nav.inventory', path: '/inventory', icon: Boxes, permission: 'inventory.view' },
    ],
  },
  {
    label: 'nav.section.operations',
    items: [
      { label: 'nav.hr', path: '/hr', icon: Briefcase, permission: { any: ['hr.view', 'hr.approve_leave'] } },
      { label: 'nav.payroll', path: '/payroll', icon: BarChart3, permission: 'payroll.view' },
      { label: 'nav.hostel', path: '/hostel', icon: BedDouble, permission: 'hostel.view' },
      { label: 'nav.transport', path: '/transport', icon: Bus, permission: 'transport.view' },
      { label: 'nav.applications', path: '/applications', icon: FileStack },
      { label: 'nav.certificates', path: '/certificates', icon: FileBadge, permission: { any: ['applications.view', 'applications.certify'] } },
    ],
  },
  {
    label: 'nav.section.community',
    items: [
      { label: 'nav.alumni', path: '/alumni', icon: Award, permission: 'alumni.view' },
      { label: 'nav.careers', path: '/careers', icon: Sparkles, permission: 'careers.view' },
    ],
  },
  {
    label: 'nav.section.administration',
    items: [
      { label: 'nav.users', path: '/users', icon: Users, permission: 'users.view' },
      { label: 'nav.roles', path: '/roles', icon: ShieldCheck, permission: 'roles.view' },
      { label: 'nav.apiKeys', path: '/settings/api-keys', icon: KeyRound, permission: 'api_keys.manage' },
      { label: 'nav.audit', path: '/audit', icon: ScrollText, permission: 'audit.view' },
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
