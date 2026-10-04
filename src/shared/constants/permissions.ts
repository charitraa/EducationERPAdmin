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
  staff: { view: 'staff.view', create: 'staff.create', update: 'staff.update', delete: 'staff.delete' },
  admissions: {
    view: 'admissions.view',
    create: 'admissions.create',
    /** Edit a pending application, and withdraw one. */
    update: 'admissions.update',
    delete: 'admissions.delete',
    /** Approve or reject. */
    review: 'admissions.review',
    enroll: 'admissions.enroll',
  },
  parents: { view: 'parents.view', create: 'parents.create', update: 'parents.update', delete: 'parents.delete' },
  users: { view: 'users.view', create: 'users.create', update: 'users.update', delete: 'users.delete', manageRoles: 'users.manage_roles' },
  roles: { view: 'roles.view', create: 'roles.create', update: 'roles.update', delete: 'roles.delete' },
  finance: {
    view: 'finance.view',
    /** The cashier: record payments and issue receipts. */
    collect: 'finance.collect',
    /** The finance office: fee setup, scholarships, invoices, cancelling, adjustments, refunds. */
    manage: 'finance.manage',
  },
  attendance: {
    view: 'attendance.view',
    /** Take attendance for your own classes (the backend checks it's yours that day). */
    mark: 'attendance.mark',
    /** The office: any class, corrections after submission, reopening, staff attendance. */
    manage: 'attendance.manage',
    devices: 'attendance.devices',
  },
  transport: { view: 'transport.view', manage: 'transport.manage' },
  hostel: { view: 'hostel.view', manage: 'hostel.manage' },
  inventory: {
    view: 'inventory.view',
    /** Catalog, suppliers, purchase orders, assets and disposals. */
    manage: 'inventory.manage',
    /** Receive, issue, transfer and adjust stock. */
    stock: 'inventory.stock',
  },
  library: {
    /** Catalog, copies, shelves and memberships. Browsing needs no permission. */
    manage: 'library.manage',
    /** The desk: issue, return, reservations and fines. */
    circulate: 'library.circulate',
  },
  exams: {
    view: 'exams.view',
    /** Enter marks for the subjects you teach (the backend checks the teaching assignment). */
    mark: 'exams.mark',
    /** The exam office: setup, seating, admit cards, verifying and correcting marks. */
    manage: 'exams.manage',
    publish: 'exams.publish',
  },
  grades: { view: 'grades.view', manage: 'grades.manage' },
  applications: {
    view: 'applications.view',
    /** Set up forms and approval chains; apply or withdraw on someone's behalf. */
    manage: 'applications.manage',
    /** Issue and revoke certificates. */
    certify: 'applications.certify',
  },
  hr: {
    view: 'hr.view',
    /** The HR office: positions, contracts, profiles, documents, leave setup and balances. */
    manage: 'hr.manage',
    /** Approve or reject leave (a head of department can hold this alone). */
    approveLeave: 'hr.approve_leave',
  },
  payroll: {
    view: 'payroll.view',
    /** Salaries, components, tax; create, compute and pay runs. */
    manage: 'payroll.manage',
    /** Approve a computed run, locking its payslips. */
    approve: 'payroll.approve',
  },
  careers: {
    view: 'careers.view',
    /** Vacancies, screening, interviews. */
    manage: 'careers.manage',
    /** Make and withdraw offers; decide a job form's last step. */
    hire: 'careers.hire',
    /** Moderate the job board. */
    board: 'careers.board',
  },
  alumni: {
    view: 'alumni.view',
    /** Alumni records, graduating classes, events and campaigns. */
    manage: 'alumni.manage',
    /** Record donations and refunds. */
    donations: 'alumni.donations',
  },
  apiKeys: { manage: 'api_keys.manage' },
  audit: { view: 'audit.view' },
  /** Platform admins only; see lib/permissions PLATFORM_ADMIN. */
  platform: { admin: '@platform' },
  support: { manage: 'support.manage' },
  notices: { manage: 'notices.manage' },
  timetable: { view: 'timetable.view', manage: 'timetable.manage' },
  events: { view: 'events.view', coordinate: 'events.coordinate', manage: 'events.manage' },
  communication: { publishSlots: 'communication.publish_slots', manageSlots: 'communication.manage_slots' },
} as const
