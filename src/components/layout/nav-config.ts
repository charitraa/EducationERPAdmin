import {
  Building2,
  ClipboardList,
  GraduationCap,
  History,
  LayoutDashboard,
  MapPin,
  Shield,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** null = always visible (no permission gate) */
  permission: string[] | null
}

export interface NavSection {
  section: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    section: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: null }],
  },
  {
    section: 'People',
    items: [
      { to: '/students', label: 'Students', icon: Users, permission: ['students.view'] },
      { to: '/parents', label: 'Parents', icon: UserRound, permission: ['parents.view'] },
      { to: '/staff', label: 'Staff', icon: GraduationCap, permission: ['staff.view'] },
      { to: '/admissions', label: 'Admissions', icon: ClipboardList, permission: ['admissions.view'] },
    ],
  },
  {
    section: 'Administration',
    items: [
      { to: '/organizations', label: 'Organizations', icon: Building2, permission: ['organizations.view'] },
      { to: '/campuses', label: 'Campuses', icon: MapPin, permission: ['campuses.view'] },
      { to: '/users', label: 'Users', icon: UserCog, permission: ['users.view'] },
      { to: '/roles', label: 'Roles', icon: Shield, permission: ['roles.view'] },
      { to: '/audit-log', label: 'Audit Log', icon: History, permission: ['audit.view'] },
    ],
  },
]
