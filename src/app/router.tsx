import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { PageLoader } from '@/components/data-display/LoadingState'
import type { PermissionRequirement } from '@/lib/permissions'
import { en } from '@/locales/en'
import { PERMS } from '@/shared/constants/permissions'
import { AcademicsLayout } from '@/features/academics/AcademicsLayout'
import { AttendanceLayout } from '@/features/attendance/AttendanceLayout'
import { EventsLayout } from '@/features/events/EventsLayout'
import { ExamsIndexGate, ExamsLayout } from '@/features/examinations/ExamsLayout'
import { FinanceLayout } from '@/features/finance/FinanceLayout'
import { HostelLayout } from '@/features/hostel/HostelLayout'
import { InventoryLayout } from '@/features/inventory/InventoryLayout'
import { HrLayout } from '@/features/hr/HrLayout'
import { PayrollLayout } from '@/features/payroll/PayrollLayout'
import { TransportLayout } from '@/features/transport/TransportLayout'
import { LibraryLayout } from '@/features/library/LibraryLayout'
import { TimetableLayout } from '@/features/timetable/TimetableLayout'
import ServerError from '@/pages/ServerError'
import { allNavItems } from './navigation'
import { PermissionRoute } from './PermissionRoute'
import { ProtectedLayout } from './ProtectedLayout'
import { ProtectedRoute } from './ProtectedRoute'

// Every page is its own chunk: first login doesn't download the whole ERP.
const LoginPage = lazy(() => import('@/features/authentication/pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/features/authentication/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/authentication/pages/ResetPasswordPage'))
const SignupPage = lazy(() => import('@/features/authentication/pages/SignupPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'))
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'))
const ProgramsPage = lazy(() => import('@/features/academics/programs/pages/ProgramsPage'))
const SubjectsPage = lazy(() => import('@/features/academics/subjects/pages/SubjectsPage'))
const CurriculumPage = lazy(() => import('@/features/academics/curriculum/pages/CurriculumPage'))
const ClassesPage = lazy(() => import('@/features/academics/classes/pages/ClassesPage'))
const TeachingPage = lazy(() => import('@/features/academics/teaching/pages/TeachingPage'))
const AcademicYearsPage = lazy(() => import('@/features/academics/academic-years/pages/AcademicYearsPage'))
const TermsPage = lazy(() => import('@/features/academics/terms/pages/TermsPage'))
const RoomsPage = lazy(() => import('@/features/academics/rooms/pages/RoomsPage'))
const CalendarPage = lazy(() => import('@/features/academics/calendar/pages/CalendarPage'))
const DepartmentsPage = lazy(() => import('@/features/academics/departments/pages/DepartmentsPage'))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'))
const OrganizationSettingsPage = lazy(() => import('@/features/settings/organization/pages/OrganizationSettingsPage'))
const BranchesPage = lazy(() => import('@/features/settings/branches/pages/BranchesPage'))
const SetupWizardPage = lazy(() => import('@/features/settings/setup/pages/SetupWizardPage'))
const StudentsListPage = lazy(() => import('@/features/students/pages/StudentsListPage'))
const StudentDetailPage = lazy(() => import('@/features/students/pages/StudentDetailPage'))
const StudentFormPage = lazy(() => import('@/features/students/pages/StudentFormPage'))
const AdmissionsListPage = lazy(() => import('@/features/admissions/pages/AdmissionsListPage'))
const AdmissionDetailPage = lazy(() => import('@/features/admissions/pages/AdmissionDetailPage'))
const ParentsListPage = lazy(() => import('@/features/parents/pages/ParentsListPage'))
const ParentDetailPage = lazy(() => import('@/features/parents/pages/ParentDetailPage'))
const StaffListPage = lazy(() => import('@/features/staff/pages/StaffListPage'))
const StaffDetailPage = lazy(() => import('@/features/staff/pages/StaffDetailPage'))
const StaffFormPage = lazy(() => import('@/features/staff/pages/StaffFormPage'))
const UsersListPage = lazy(() => import('@/features/users/pages/UsersListPage'))
const UserDetailPage = lazy(() => import('@/features/users/pages/UserDetailPage'))
const RolesListPage = lazy(() => import('@/features/roles/pages/RolesListPage'))
const RoleEditorPage = lazy(() => import('@/features/roles/pages/RoleEditorPage'))
const NoticesListPage = lazy(() => import('@/features/notices/pages/NoticesListPage'))
const NoticePage = lazy(() => import('@/features/notices/pages/NoticePage'))
const TicketsListPage = lazy(() => import('@/features/support/pages/TicketsListPage'))
const TicketDetailPage = lazy(() => import('@/features/support/pages/TicketDetailPage'))
const MessagesPage = lazy(() => import('@/features/communication/pages/MessagesPage'))
const AppointmentsPage = lazy(() => import('@/features/communication/pages/AppointmentsPage'))
const EventsListPage = lazy(() => import('@/features/events/pages/EventsListPage'))
const EventDetailPage = lazy(() => import('@/features/events/pages/EventDetailPage'))
const EventCategoriesPage = lazy(() => import('@/features/events/pages/CategoriesPage'))
const PointRulesPage = lazy(() => import('@/features/events/pages/PointRulesPage'))
const AwardsPage = lazy(() => import('@/features/events/pages/AwardsPage'))
const LeaderboardPage = lazy(() => import('@/features/events/pages/LeaderboardPage'))
const WeekPage = lazy(() => import('@/features/timetable/pages/WeekPage'))
const DayPage = lazy(() => import('@/features/timetable/pages/DayPage'))
const LessonChangesPage = lazy(() => import('@/features/timetable/pages/LessonChangesPage'))
const BellSchedulesPage = lazy(() => import('@/features/timetable/pages/BellSchedulesPage'))
const AttendanceTodayPage = lazy(() => import('@/features/attendance/pages/TodayPage'))
const AttendanceSessionsPage = lazy(() => import('@/features/attendance/pages/SessionsPage'))
const RollCallPage = lazy(() => import('@/features/attendance/pages/RollCallPage'))
const AttendanceReportsPage = lazy(() => import('@/features/attendance/pages/ReportsPage'))
const StaffAttendancePage = lazy(() => import('@/features/attendance/pages/StaffAttendancePage'))
const WorkSchedulesPage = lazy(() => import('@/features/attendance/pages/WorkSchedulesPage'))
const AttendanceDevicesPage = lazy(() => import('@/features/attendance/pages/DevicesPage'))
const ExamsListPage = lazy(() => import('@/features/examinations/pages/ExamsListPage'))
const ExamDetailPage = lazy(() => import('@/features/examinations/pages/ExamDetailPage'))
const MarkSheetsPage = lazy(() => import('@/features/examinations/pages/MarkSheetsPage'))
const MarkEntryPage = lazy(() => import('@/features/examinations/pages/MarkEntryPage'))
const ResultsPage = lazy(() => import('@/features/examinations/pages/ResultsPage'))
const TermResultsPage = lazy(() => import('@/features/examinations/pages/TermResultsPage'))
const ReportCardsPage = lazy(() => import('@/features/examinations/pages/ReportCardsPage'))
const TranscriptsPage = lazy(() => import('@/features/examinations/pages/TranscriptsPage'))
const GradeScalesPage = lazy(() => import('@/features/examinations/pages/GradeScalesPage'))
const ExamTypesPage = lazy(() => import('@/features/examinations/pages/ExamTypesPage'))
const FinanceOverviewPage = lazy(() => import('@/features/finance/pages/OverviewPage'))
const InvoicesPage = lazy(() => import('@/features/finance/pages/InvoicesPage'))
const InvoiceDetailPage = lazy(() => import('@/features/finance/pages/InvoiceDetailPage'))
const PaymentsPage = lazy(() => import('@/features/finance/pages/PaymentsPage'))
const ReceiptPage = lazy(() => import('@/features/finance/pages/ReceiptPage'))
const FeeStructuresPage = lazy(() => import('@/features/finance/pages/FeeStructuresPage'))
const ScholarshipsPage = lazy(() => import('@/features/finance/pages/ScholarshipsPage'))
const FinanceReportsPage = lazy(() => import('@/features/finance/pages/FinanceReportsPage'))
const LibraryDeskPage = lazy(() => import('@/features/library/pages/DeskPage'))
const LibraryBooksPage = lazy(() => import('@/features/library/pages/BooksPage'))
const LibraryBookPage = lazy(() => import('@/features/library/pages/BookDetailPage'))
const LibraryMembersPage = lazy(() => import('@/features/library/pages/MembersPage'))
const LibraryLoansPage = lazy(() => import('@/features/library/pages/CirculationPages').then((m) => ({ default: m.LoansPage })))
const LibraryReservationsPage = lazy(() => import('@/features/library/pages/CirculationPages').then((m) => ({ default: m.ReservationsPage })))
const LibraryFinesPage = lazy(() => import('@/features/library/pages/CirculationPages').then((m) => ({ default: m.FinesPage })))
const LibrarySetupPage = lazy(() => import('@/features/library/pages/CatalogSetupPage'))
const InventoryStockPage = lazy(() => import('@/features/inventory/pages/StockPage'))
const InventoryItemsPage = lazy(() => import('@/features/inventory/pages/ItemsPage'))
const PurchasesPage = lazy(() => import('@/features/inventory/pages/PurchasesPage'))
const PurchaseDetailPage = lazy(() => import('@/features/inventory/pages/PurchasesPage').then((m) => ({ default: m.PurchaseDetailPage })))
const AssetsPage = lazy(() => import('@/features/inventory/pages/AssetsPage'))
const AssetDetailPage = lazy(() => import('@/features/inventory/pages/AssetsPage').then((m) => ({ default: m.AssetDetailPage })))
const AssignmentsPage = lazy(() => import('@/features/inventory/pages/AssetActivityPages').then((m) => ({ default: m.AssignmentsPage })))
const MaintenancePage = lazy(() => import('@/features/inventory/pages/AssetActivityPages').then((m) => ({ default: m.MaintenancePage })))
const InventorySetupPage = lazy(() => import('@/features/inventory/pages/InventorySetupPage'))
const HostelBoardPage = lazy(() => import('@/features/hostel/pages/AllocationPages').then((m) => ({ default: m.BoardPage })))
const HostelAllocationsPage = lazy(() => import('@/features/hostel/pages/AllocationPages').then((m) => ({ default: m.AllocationsPage })))
const HostelRoomsPage = lazy(() => import('@/features/hostel/pages/StructurePages').then((m) => ({ default: m.RoomsPage })))
const HostelBuildingsPage = lazy(() => import('@/features/hostel/pages/StructurePages').then((m) => ({ default: m.BuildingsPage })))
const HostelComplaintsPage = lazy(() => import('@/features/hostel/pages/ComplaintsPage'))
const LeaveRequestsPage = lazy(() => import('@/features/hr/pages/LeavePages').then((m) => ({ default: m.LeaveRequestsPage })))
const LeaveBalancesPage = lazy(() => import('@/features/hr/pages/LeavePages').then((m) => ({ default: m.LeaveBalancesPage })))
const ContractsPage = lazy(() => import('@/features/hr/pages/PeoplePages').then((m) => ({ default: m.ContractsPage })))
const HrProfilesPage = lazy(() => import('@/features/hr/pages/PeoplePages').then((m) => ({ default: m.ProfilesPage })))
const HrDocumentsPage = lazy(() => import('@/features/hr/pages/PeoplePages').then((m) => ({ default: m.DocumentsPage })))
const HrSetupPage = lazy(() => import('@/features/hr/pages/HrSetupPage').then((m) => ({ default: m.HrSetupPage })))
const PayrollRunsPage = lazy(() => import('@/features/payroll/pages/RunPages').then((m) => ({ default: m.RunsPage })))
const PayrollRunPage = lazy(() => import('@/features/payroll/pages/RunPages').then((m) => ({ default: m.RunDetailPage })))
const PayslipsPage = lazy(() => import('@/features/payroll/pages/PayslipPages').then((m) => ({ default: m.PayslipsPage })))
const PayslipPage = lazy(() => import('@/features/payroll/pages/PayslipPages').then((m) => ({ default: m.PayslipPage })))
const SalariesPage = lazy(() => import('@/features/payroll/pages/SalaryPages').then((m) => ({ default: m.SalariesPage })))
const PayrollAdjustmentsPage = lazy(() => import('@/features/payroll/pages/SalaryPages').then((m) => ({ default: m.AdjustmentsPage })))
const PayrollSetupPage = lazy(() => import('@/features/payroll/pages/PayrollSetupPage').then((m) => ({ default: m.PayrollSetupPage })))
const TripsPage = lazy(() => import('@/features/transport/pages/TripPages').then((m) => ({ default: m.TripsPage })))
const TripPage = lazy(() => import('@/features/transport/pages/TripPages').then((m) => ({ default: m.TripPage })))
const RoutesPage = lazy(() => import('@/features/transport/pages/RoutePages').then((m) => ({ default: m.RoutesPage })))
const RouteDetailPage = lazy(() => import('@/features/transport/pages/RoutePages').then((m) => ({ default: m.RouteDetailPage })))
const RidersPage = lazy(() => import('@/features/transport/pages/RoutePages').then((m) => ({ default: m.RidersPage })))
const VehiclesPage = lazy(() => import('@/features/transport/pages/FleetPages').then((m) => ({ default: m.VehiclesPage })))
const VehicleDetailPage = lazy(() => import('@/features/transport/pages/FleetPages').then((m) => ({ default: m.VehicleDetailPage })))
const CrewPage = lazy(() => import('@/features/transport/pages/FleetPages').then((m) => ({ default: m.CrewPage })))
const PlannedModulePage = lazy(() => import('@/pages/PlannedModulePage'))
const PublicPlaceholder = lazy(() => import('@/pages/PublicPlaceholder'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function page(Component: ComponentType, permission?: PermissionRequirement): ReactNode {
  const el = (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  )
  return permission ? <PermissionRoute permission={permission}>{el}</PermissionRoute> : el
}

const crumb = (label: string) => ({ crumb: label })

/** Modules whose screens aren't built yet: real routes and permission checks, placeholder page. */
const plannedRoutes: RouteObject[] = allNavItems
  .filter((item) => item.status === 'planned')
  .map((item) => ({
    path: `${item.path.slice(1)}/*`,
    handle: crumb(en[item.label]),
    element: page(PlannedModulePage, item.permission),
  }))

const academicsRoutes: RouteObject = {
  path: 'academics',
  handle: crumb('Academics'),
  element: (
    <PermissionRoute permission={PERMS.academics.view}>
      <AcademicsLayout />
    </PermissionRoute>
  ),
  children: [
    { index: true, element: <Navigate to="programs" replace /> },
    { path: 'programs', handle: crumb('Programs'), element: page(ProgramsPage) },
    { path: 'subjects', handle: crumb('Subjects'), element: page(SubjectsPage) },
    { path: 'curriculum', handle: crumb('Curriculum'), element: page(CurriculumPage) },
    { path: 'classes', handle: crumb('Classes'), element: page(ClassesPage) },
    { path: 'teaching', handle: crumb('Teaching'), element: page(TeachingPage) },
    { path: 'academic-years', handle: crumb('Academic years'), element: page(AcademicYearsPage) },
    { path: 'terms', handle: crumb('Terms'), element: page(TermsPage) },
    { path: 'rooms', handle: crumb('Rooms'), element: page(RoomsPage) },
    { path: 'calendar', handle: crumb('Calendar'), element: page(CalendarPage) },
    { path: 'departments', handle: crumb('Departments'), element: page(DepartmentsPage) },
  ],
}

const studentsRoutes: RouteObject = {
  path: 'students',
  handle: crumb('Students'),
  element: <PermissionRoute permission={PERMS.students.view} />,
  children: [
    { index: true, element: page(StudentsListPage) },
    { path: 'new', handle: crumb('Add student'), element: page(StudentFormPage, PERMS.students.create) },
    { path: ':id', handle: crumb('Student'), element: page(StudentDetailPage) },
    { path: ':id/edit', handle: crumb('Edit'), element: page(StudentFormPage, PERMS.students.update) },
  ],
}

const admissionsRoutes: RouteObject = {
  path: 'admissions',
  handle: crumb('Admissions'),
  element: <PermissionRoute permission={PERMS.admissions.view} />,
  children: [
    { index: true, element: page(AdmissionsListPage) },
    { path: ':id', handle: crumb('Application'), element: page(AdmissionDetailPage) },
  ],
}

const parentsRoutes: RouteObject = {
  path: 'parents',
  handle: crumb('Parents'),
  element: <PermissionRoute permission={PERMS.parents.view} />,
  children: [
    { index: true, element: page(ParentsListPage) },
    { path: ':id', handle: crumb('Parent'), element: page(ParentDetailPage) },
  ],
}

const staffRoutes: RouteObject = {
  path: 'staff',
  handle: crumb('Staff'),
  element: <PermissionRoute permission={PERMS.staff.view} />,
  children: [
    { index: true, element: page(StaffListPage) },
    { path: 'new', handle: crumb('Add staff member'), element: page(StaffFormPage, PERMS.staff.create) },
    { path: ':id', handle: crumb('Staff member'), element: page(StaffDetailPage) },
    { path: ':id/edit', handle: crumb('Edit'), element: page(StaffFormPage, PERMS.staff.update) },
  ],
}

const usersRoutes: RouteObject = {
  path: 'users',
  handle: crumb('Users'),
  element: <PermissionRoute permission={PERMS.users.view} />,
  children: [
    { index: true, element: page(UsersListPage) },
    { path: ':id', handle: crumb('User'), element: page(UserDetailPage) },
  ],
}

const rolesRoutes: RouteObject = {
  path: 'roles',
  handle: crumb('Roles'),
  element: <PermissionRoute permission={PERMS.roles.view} />,
  children: [
    { index: true, element: page(RolesListPage) },
    { path: 'new', handle: crumb('New role'), element: page(RoleEditorPage, PERMS.roles.create) },
    { path: ':id', handle: crumb('Role'), element: page(RoleEditorPage) },
  ],
}

// Every member may read notices; writing needs notices.manage.
const noticesRoutes: RouteObject = {
  path: 'notices',
  handle: crumb('Notices'),
  children: [
    { index: true, element: page(NoticesListPage) },
    { path: 'new', handle: crumb('Write a notice'), element: page(NoticePage, PERMS.notices.manage) },
    { path: ':id', handle: crumb('Notice'), element: page(NoticePage) },
  ],
}

// Anyone may raise a ticket and follow their own; support.manage sees the office queue.
const supportRoutes: RouteObject = {
  path: 'support',
  handle: crumb('Support'),
  children: [
    { index: true, element: <Navigate to="tickets" replace /> },
    { path: 'tickets', element: page(TicketsListPage) },
    { path: 'tickets/:id', handle: crumb('Ticket'), element: page(TicketDetailPage) },
  ],
}

// Everyone has conversations; who may start one or publish slots is checked in place.
const messagesRoutes: RouteObject = {
  path: 'messages',
  handle: crumb('Messages'),
  children: [
    { index: true, element: page(MessagesPage) },
    { path: 'appointments', handle: crumb('Appointments'), element: page(AppointmentsPage) },
    { path: ':threadId', handle: crumb('Conversation'), element: page(MessagesPage) },
  ],
}

const eventsRoutes: RouteObject = {
  path: 'events',
  handle: crumb('Events'),
  element: <PermissionRoute permission={PERMS.events.view} />,
  children: [
    {
      element: <EventsLayout />,
      children: [
        { index: true, element: page(EventsListPage) },
        { path: 'leaderboard', handle: crumb('Leaderboard'), element: page(LeaderboardPage) },
        { path: 'awards', handle: crumb('Awards'), element: page(AwardsPage) },
        { path: 'point-rules', handle: crumb('Point rules'), element: page(PointRulesPage) },
        { path: 'categories', handle: crumb('Categories'), element: page(EventCategoriesPage) },
      ],
    },
    { path: ':id', handle: crumb('Event'), element: page(EventDetailPage) },
  ],
}

const timetableRoutes: RouteObject = {
  path: 'timetable',
  handle: crumb('Timetable'),
  element: (
    <PermissionRoute permission={PERMS.timetable.view}>
      <TimetableLayout />
    </PermissionRoute>
  ),
  children: [
    { index: true, element: page(WeekPage) },
    { path: 'day', handle: crumb('Day'), element: page(DayPage) },
    { path: 'lesson-changes', handle: crumb('Lesson changes'), element: page(LessonChangesPage) },
    { path: 'bell-schedules', handle: crumb('Bell schedules'), element: page(BellSchedulesPage) },
  ],
}

// Teachers with only attendance.mark get Today and the roll call; the rest is the office's.
const attendanceRoutes: RouteObject = {
  path: 'attendance',
  handle: crumb('Attendance'),
  element: <PermissionRoute permission={{ any: [PERMS.attendance.view, PERMS.attendance.mark] }} />,
  children: [
    {
      element: <AttendanceLayout />,
      children: [
        { index: true, element: page(AttendanceTodayPage) },
        { path: 'sessions', handle: crumb('Sessions'), element: page(AttendanceSessionsPage, PERMS.attendance.view) },
        { path: 'reports', handle: crumb('Reports'), element: page(AttendanceReportsPage, PERMS.attendance.view) },
        { path: 'staff', handle: crumb('Staff'), element: page(StaffAttendancePage, PERMS.attendance.view) },
        { path: 'schedules', handle: crumb('Work schedules'), element: page(WorkSchedulesPage, PERMS.attendance.view) },
        { path: 'devices', handle: crumb('Devices'), element: page(AttendanceDevicesPage, PERMS.attendance.devices) },
      ],
    },
    { path: 'sessions/:id', handle: crumb('Roll call'), element: page(RollCallPage) },
  ],
}

// Teachers with only exams.mark get their mark sheets; the rest is the exam office's.
const examinationsRoutes: RouteObject = {
  path: 'examinations',
  handle: crumb('Examinations'),
  element: <PermissionRoute permission={{ any: [PERMS.exams.view, PERMS.exams.mark] }} />,
  children: [
    {
      element: <ExamsLayout />,
      children: [
        { index: true, element: <ExamsIndexGate>{page(ExamsListPage)}</ExamsIndexGate> },
        { path: 'mark-sheets', handle: crumb('Mark sheets'), element: page(MarkSheetsPage) },
        { path: 'results', handle: crumb('Results'), element: page(ResultsPage, PERMS.exams.view) },
        { path: 'term-results', handle: crumb('Term results'), element: page(TermResultsPage, PERMS.exams.view) },
        { path: 'report-cards', handle: crumb('Report cards'), element: page(ReportCardsPage, PERMS.exams.view) },
        { path: 'transcripts', handle: crumb('Transcripts'), element: page(TranscriptsPage, PERMS.exams.view) },
        { path: 'grades', handle: crumb('Grade scales'), element: page(GradeScalesPage, PERMS.grades.view) },
        { path: 'types', handle: crumb('Exam types'), element: page(ExamTypesPage, PERMS.exams.view) },
      ],
    },
    { path: 'mark-sheets/:id', handle: crumb('Marks'), element: page(MarkEntryPage) },
    { path: ':id', handle: crumb('Exam'), element: page(ExamDetailPage, PERMS.exams.view) },
  ],
}

// Every finance list needs finance.view; a cashier also needs it to find invoices to take payments on.
const financeRoutes: RouteObject = {
  path: 'finance',
  handle: crumb('Finance'),
  element: <PermissionRoute permission={PERMS.finance.view} />,
  children: [
    {
      element: <FinanceLayout />,
      children: [
        { index: true, element: page(FinanceOverviewPage) },
        { path: 'invoices', handle: crumb('Invoices'), element: page(InvoicesPage) },
        { path: 'payments', handle: crumb('Payments'), element: page(PaymentsPage) },
        { path: 'fees', handle: crumb('Fee structures'), element: page(FeeStructuresPage) },
        { path: 'scholarships', handle: crumb('Scholarships'), element: page(ScholarshipsPage) },
        { path: 'reports', handle: crumb('Reports'), element: page(FinanceReportsPage) },
      ],
    },
    { path: 'invoices/:id', handle: crumb('Invoice'), element: page(InvoiceDetailPage) },
    { path: 'payments/:id', handle: crumb('Receipt'), element: page(ReceiptPage) },
  ],
}

// Browsing the catalog is open to staff; the desk and memberships need library permissions.
// Loans, reservations and fines lists are scoped by the backend (staff see their branch, members their own).
const libraryRoutes: RouteObject = {
  path: 'library',
  handle: crumb('Library'),
  element: <PermissionRoute permission={{ any: [PERMS.library.circulate, PERMS.library.manage] }} />,
  children: [
    {
      element: <LibraryLayout />,
      children: [
        { index: true, element: page(LibraryDeskPage) },
        { path: 'books', handle: crumb('Books'), element: page(LibraryBooksPage) },
        { path: 'members', handle: crumb('Members'), element: page(LibraryMembersPage, PERMS.library.manage) },
        { path: 'loans', handle: crumb('Loans'), element: page(LibraryLoansPage) },
        { path: 'reservations', handle: crumb('Reservations'), element: page(LibraryReservationsPage) },
        { path: 'fines', handle: crumb('Fines'), element: page(LibraryFinesPage) },
        { path: 'setup', handle: crumb('Catalog setup'), element: page(LibrarySetupPage, PERMS.library.manage) },
      ],
    },
    { path: 'books/:id', handle: crumb('Book'), element: page(LibraryBookPage) },
  ],
}

const inventoryRoutes: RouteObject = {
  path: 'inventory',
  handle: crumb('Inventory'),
  element: <PermissionRoute permission={PERMS.inventory.view} />,
  children: [
    {
      element: <InventoryLayout />,
      children: [
        { index: true, element: page(InventoryStockPage) },
        { path: 'items', handle: crumb('Items'), element: page(InventoryItemsPage) },
        { path: 'purchases', handle: crumb('Purchases'), element: page(PurchasesPage) },
        { path: 'assets', handle: crumb('Assets'), element: page(AssetsPage) },
        { path: 'assignments', handle: crumb('Assignments'), element: page(AssignmentsPage) },
        { path: 'maintenance', handle: crumb('Maintenance'), element: page(MaintenancePage) },
        { path: 'categories', handle: crumb('Categories & stores'), element: page(InventorySetupPage) },
      ],
    },
    { path: 'purchases/:id', handle: crumb('Order'), element: page(PurchaseDetailPage) },
    { path: 'assets/:id', handle: crumb('Asset'), element: page(AssetDetailPage) },
  ],
}

// Someone holding only hr.approve_leave (a head of department) gets the leave queue.
const hrRoutes: RouteObject = {
  path: 'hr',
  handle: crumb('HR'),
  element: (
    <PermissionRoute permission={{ any: [PERMS.hr.view, PERMS.hr.approveLeave] }}>
      <HrLayout />
    </PermissionRoute>
  ),
  children: [
    { index: true, element: page(LeaveRequestsPage) },
    { path: 'leave-requests', element: <Navigate to="/hr" replace /> },
    { path: 'leave', handle: crumb('Leave balances'), element: page(LeaveBalancesPage, PERMS.hr.view) },
    { path: 'contracts', handle: crumb('Contracts'), element: page(ContractsPage, PERMS.hr.view) },
    { path: 'profiles', handle: crumb('HR profiles'), element: page(HrProfilesPage, PERMS.hr.view) },
    { path: 'documents', handle: crumb('Documents'), element: page(HrDocumentsPage, PERMS.hr.view) },
    { path: 'setup', handle: crumb('Setup'), element: page(HrSetupPage, PERMS.hr.view) },
    // Staff attendance lives with the rest of attendance.
    { path: 'attendance', element: <Navigate to="/attendance/staff" replace /> },
  ],
}

const payrollRoutes: RouteObject = {
  path: 'payroll',
  handle: crumb('Payroll'),
  element: <PermissionRoute permission={PERMS.payroll.view} />,
  children: [
    {
      element: <PayrollLayout />,
      children: [
        { index: true, element: page(PayrollRunsPage) },
        { path: 'payslips', handle: crumb('Payslips'), element: page(PayslipsPage) },
        { path: 'salaries', handle: crumb('Salaries'), element: page(SalariesPage) },
        { path: 'adjustments', handle: crumb('Adjustments'), element: page(PayrollAdjustmentsPage) },
        { path: 'setup', handle: crumb('Setup'), element: page(PayrollSetupPage) },
      ],
    },
    { path: 'runs', element: <Navigate to="/payroll" replace /> },
    { path: 'runs/:id', handle: crumb('Run'), element: page(PayrollRunPage) },
    { path: 'payslips/:id', handle: crumb('Payslip'), element: page(PayslipPage) },
  ],
}

const hostelRoutes: RouteObject = {
  path: 'hostel',
  handle: crumb('Hostel'),
  element: (
    <PermissionRoute permission={PERMS.hostel.view}>
      <HostelLayout />
    </PermissionRoute>
  ),
  children: [
    { index: true, element: page(HostelBoardPage) },
    { path: 'allocations', handle: crumb('Allocations'), element: page(HostelAllocationsPage) },
    { path: 'rooms', handle: crumb('Rooms & beds'), element: page(HostelRoomsPage) },
    { path: 'beds', element: <Navigate to="/hostel" replace /> },
    { path: 'buildings', handle: crumb('Buildings'), element: page(HostelBuildingsPage) },
    { path: 'complaints', handle: crumb('Complaints'), element: page(HostelComplaintsPage) },
  ],
}

// The crew can run their own route's trips without transport.view; those screens come with self-service.
const transportRoutes: RouteObject = {
  path: 'transport',
  handle: crumb('Transport'),
  element: <PermissionRoute permission={PERMS.transport.view} />,
  children: [
    {
      element: <TransportLayout />,
      children: [
        { index: true, element: page(TripsPage) },
        { path: 'routes', handle: crumb('Routes & stops'), element: page(RoutesPage) },
        { path: 'stops', element: <Navigate to="/transport/routes" replace /> },
        { path: 'assignments', handle: crumb('Riders'), element: page(RidersPage) },
        { path: 'vehicles', handle: crumb('Vehicles'), element: page(VehiclesPage) },
        { path: 'crew', handle: crumb('Crew'), element: page(CrewPage) },
      ],
    },
    { path: 'trips', element: <Navigate to="/transport" replace /> },
    { path: 'trips/:id', handle: crumb('Trip'), element: page(TripPage) },
    { path: 'routes/:id', handle: crumb('Route'), element: page(RouteDetailPage) },
    { path: 'vehicles/:id', handle: crumb('Vehicle'), element: page(VehicleDetailPage) },
  ],
}

const settingsRoutes: RouteObject = {
  path: 'settings',
  handle: crumb('Settings'),
  children: [
    { index: true, element: page(SettingsPage) },
    { path: 'organization', handle: crumb('Organization'), element: page(OrganizationSettingsPage, PERMS.organizations.view) },
    { path: 'branches', handle: crumb('Branches'), element: page(BranchesPage, PERMS.campuses.view) },
    { path: 'setup', handle: crumb('Setup'), element: page(SetupWizardPage, PERMS.organizations.update) },
  ],
}

export const router = createBrowserRouter([
  { path: '/login', element: page(LoginPage) },
  { path: '/forgot-password', element: page(ForgotPasswordPage) },
  { path: '/reset-password', element: page(ResetPasswordPage) },
  { path: '/signup', element: page(SignupPage) },
  {
    path: '/public/:organizationCode',
    children: [
      { path: 'admission', element: page(PublicPlaceholder) },
      { path: 'admission/status', element: page(PublicPlaceholder) },
      { path: 'careers', element: page(PublicPlaceholder) },
      { path: 'careers/:id', element: page(PublicPlaceholder) },
      { path: 'application/status', element: page(PublicPlaceholder) },
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <ServerError />,
    children: [
      {
        path: '/',
        element: <ProtectedLayout />,
        errorElement: <ServerError />,
        handle: crumb('Dashboard'),
        children: [
          { index: true, element: page(DashboardPage) },
          { path: 'me', handle: crumb('My profile'), element: page(ProfilePage) },
          { path: 'notifications', handle: crumb('Notifications'), element: page(NotificationsPage) },
          studentsRoutes,
          admissionsRoutes,
          parentsRoutes,
          staffRoutes,
          usersRoutes,
          rolesRoutes,
          noticesRoutes,
          supportRoutes,
          messagesRoutes,
          eventsRoutes,
          timetableRoutes,
          attendanceRoutes,
          examinationsRoutes,
          financeRoutes,
          libraryRoutes,
          inventoryRoutes,
          hrRoutes,
          payrollRoutes,
          hostelRoutes,
          transportRoutes,
          academicsRoutes,
          settingsRoutes,
          ...plannedRoutes,
          { path: '*', element: page(NotFound) },
        ],
      },
    ],
  },
], {
  // Opt in to React Router v7 behavior now, so upgrading later changes nothing.
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
})
