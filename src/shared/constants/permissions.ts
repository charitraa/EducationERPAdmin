/**
 * Permission codes the UI checks, as registered by the backend
 * (core/permissions/registry.py and each module's permission specs).
 */
export const PERMS = {
  organizations: { view: 'organizations.view', update: 'organizations.update' },
  campuses: { view: 'campuses.view', create: 'campuses.create', update: 'campuses.update', delete: 'campuses.delete' },
  academics: {
    view: 'academics.view',
    /** Programs, subjects, curriculum, departments, academic years, terms. */
    structure: 'academics.manage_structure',
    /** Classes (sections), rooms, batches, teaching assignments. */
    classes: 'academics.manage_classes',
    calendar: 'academics.manage_calendar',
  },
  students: {
    view: 'students.view',
    create: 'students.create',
    update: 'students.update',
    delete: 'students.delete',
    /** Suspend, reactivate, graduate, withdraw and transfer. */
    changeStatus: 'students.change_status',
    /** Place in a class, promote, move between classes. */
    place: 'students.place',
  },
  staff: { view: 'staff.view' },
  admissions: { view: 'admissions.view' },
  parents: { view: 'parents.view' },
  users: { view: 'users.view' },
  finance: { view: 'finance.view' },
  attendance: { view: 'attendance.view', mark: 'attendance.mark' },
  exams: { view: 'exams.view', mark: 'exams.mark' },
  applications: { view: 'applications.view' },
  hr: { view: 'hr.view', approveLeave: 'hr.approve_leave' },
  support: { manage: 'support.manage' },
} as const
