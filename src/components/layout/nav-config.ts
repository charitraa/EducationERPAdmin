export interface NavItem {
  to: string
  label: string
  /** Font Awesome class, e.g. "fa-solid fa-gauge" — matches CoolAdmin's own sidebar markup. */
  icon: string
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
    items: [{ to: '/', label: 'Dashboard', icon: 'fa-solid fa-gauge', permission: null }],
  },
  {
    section: 'People',
    items: [
      { to: '/students', label: 'Students', icon: 'fa-solid fa-user-graduate', permission: ['students.view'] },
      { to: '/parents', label: 'Parents', icon: 'fa-solid fa-people-roof', permission: ['parents.view'] },
      { to: '/staff', label: 'Staff', icon: 'fa-solid fa-chalkboard-user', permission: ['staff.view'] },
      { to: '/admissions', label: 'Admissions', icon: 'fa-solid fa-clipboard-list', permission: ['admissions.view'] },
    ],
  },
  {
    section: 'Administration',
    items: [
      { to: '/organizations', label: 'Organizations', icon: 'fa-solid fa-building', permission: ['organizations.view'] },
      { to: '/campuses', label: 'Campuses', icon: 'fa-solid fa-map-marker-alt', permission: ['campuses.view'] },
      { to: '/users', label: 'Users', icon: 'fa-solid fa-user-gear', permission: ['users.view'] },
      { to: '/roles', label: 'Roles', icon: 'fa-solid fa-shield-halved', permission: ['roles.view'] },
      { to: '/audit-log', label: 'Audit Log', icon: 'fa-solid fa-clock-rotate-left', permission: ['audit.view'] },
    ],
  },
]
