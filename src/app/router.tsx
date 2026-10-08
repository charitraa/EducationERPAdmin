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
import { ApplicationsLayout } from '@/features/applications/ApplicationsLayout'
import { AlumniLayout } from '@/features/alumni/AlumniLayout'
import { CareersLayout } from '@/features/careers/CareersLayout'
import { HrLayout } from '@/features/hr/HrLayout'
import { PayrollLayout } from '@/features/payroll/PayrollLayout'
import { TransportLayout } from '@/features/transport/TransportLayout'
import { LibraryLayout } from '@/features/library/LibraryLayout'
import { TimetableLayout } from '@/features/timetable/TimetableLayout'
import { SelfLayout } from '@/features/self/SelfLayout'
import ServerError from '@/pages/ServerError'
import { allNavItems } from './navigation'
import { PermissionRoute } from './PermissionRoute'
import { ProtectedLayout } from './ProtectedLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { tr, trc } from '@/lib/i18n'

// Every page is its own chunk: first login doesn't download the whole ERP.
const LoginPage = lazy(() => import('@/features/authentication/pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/features/authentication/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/authentication/pages/ResetPasswordPage'))
const SignupPage = lazy(() => import('@/features/authentication/pages/SignupPage'))
const SignupVerifyPage = lazy(() => import('@/features/authentication/pages/SignupVerifyPage'))
const TermsOfServicePage = lazy(() => import('@/features/landing/pages/LegalPage').then((m) => ({ default: () => <m.default kind="terms" /> })))
const PrivacyPage = lazy(() => import('@/features/landing/pages/LegalPage').then((m) => ({ default: () => <m.default kind="privacy" /> })))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'))
const ProfilePage = lazy(() => import('@/features/profile/pages/ProfilePage'))
const SelfMyTimetablePage = lazy(() => import('@/features/self/pages/SharedPages').then((m) => ({ default: m.MyTimetablePage })))
const SelfMyAttendancePage = lazy(() => import('@/features/self/pages/SharedPages').then((m) => ({ default: m.MyAttendancePage })))
const SelfMyTransportPage = lazy(() => import('@/features/self/pages/SharedPages').then((m) => ({ default: m.MyTransportPage })))
const SelfMyHostelPage = lazy(() => import('@/features/self/pages/SharedPages').then((m) => ({ default: m.MyHostelPage })))
const SelfMyLibraryPage = lazy(() => import('@/features/self/pages/SharedPages').then((m) => ({ default: m.MyLibraryPage })))
const SelfMyApplicationsPage = lazy(() => import('@/features/self/pages/SharedPages').then((m) => ({ default: m.MyApplicationsPage })))
const SelfMyLeavePage = lazy(() => import('@/features/self/pages/StaffPages').then((m) => ({ default: m.MyLeavePage })))
const SelfMyPayslipsPage = lazy(() => import('@/features/self/pages/StaffPages').then((m) => ({ default: m.MyPayslipsPage })))
const SelfMyPayslipPage = lazy(() => import('@/features/self/pages/StaffPages').then((m) => ({ default: m.MyPayslipPage })))
const SelfMyEmploymentPage = lazy(() => import('@/features/self/pages/StaffPages').then((m) => ({ default: m.MyEmploymentPage })))
const SelfMyAssetsPage = lazy(() => import('@/features/self/pages/StaffPages').then((m) => ({ default: m.MyAssetsPage })))
const SelfMyMarkingPage = lazy(() => import('@/features/self/pages/StaffPages').then((m) => ({ default: m.MyMarkingPage })))
const SelfMyInterviewsPage = lazy(() => import('@/features/self/pages/StaffPages').then((m) => ({ default: m.MyInterviewsPage })))
const SelfMyJobsPage = lazy(() => import('@/features/self/pages/CommunityPages').then((m) => ({ default: m.MyJobsPage })))
const SelfMyExamsPage = lazy(() => import('@/features/self/pages/StudentPages').then((m) => ({ default: m.MyExamsPage })))
const SelfMyAdmitCardPage = lazy(() => import('@/features/self/pages/StudentPages').then((m) => ({ default: m.MyAdmitCardPage })))
const SelfMyResultsPage = lazy(() => import('@/features/self/pages/StudentPages').then((m) => ({ default: m.MyResultsPage })))
const SelfMyFeesPage = lazy(() => import('@/features/self/pages/StudentPages').then((m) => ({ default: m.MyFeesPage })))
const SelfMyEventsPage = lazy(() => import('@/features/self/pages/StudentPages').then((m) => ({ default: m.MyEventsPage })))
const SelfMyCertificatesPage = lazy(() => import('@/features/self/pages/StudentPages').then((m) => ({ default: m.MyCertificatesPage })))
const SelfMyCertificatePage = lazy(() => import('@/features/self/pages/StudentPages').then((m) => ({ default: m.MyCertificatePage })))
const SelfMyMentoringPage = lazy(() => import('@/features/self/pages/CommunityPages').then((m) => ({ default: m.MyMentoringPage })))
const SelfMyAlumniEventsPage = lazy(() => import('@/features/self/pages/CommunityPages').then((m) => ({ default: m.MyAlumniEventsPage })))
const NotificationsPage = lazy(() => import('@/features/notifications/pages/NotificationsPage'))
const ProgramsPage = lazy(() => import('@/features/academics/programs/pages/ProgramsPage'))
const SubjectsPage = lazy(() => import('@/features/academics/subjects/pages/SubjectsPage'))
const CurriculumPage = lazy(() => import('@/features/academics/curriculum/pages/CurriculumPage'))
const ClassesPage = lazy(() => import('@/features/academics/classes/pages/ClassesPage'))
const ElectivesPage = lazy(() => import('@/features/academics/electives/pages/ElectivesPage'))
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
const StudentImportPage = lazy(() => import('@/features/students/pages/StudentImportPage'))
const AdmissionsListPage = lazy(() => import('@/features/admissions/pages/AdmissionsListPage'))
const AdmissionDetailPage = lazy(() => import('@/features/admissions/pages/AdmissionDetailPage'))
const ParentsListPage = lazy(() => import('@/features/parents/pages/ParentsListPage'))
const ParentDetailPage = lazy(() => import('@/features/parents/pages/ParentDetailPage'))
const StaffListPage = lazy(() => import('@/features/staff/pages/StaffListPage'))
const StaffDetailPage = lazy(() => import('@/features/staff/pages/StaffDetailPage'))
const StaffFormPage = lazy(() => import('@/features/staff/pages/StaffFormPage'))
const StaffImportPage = lazy(() => import('@/features/staff/pages/StaffImportPage'))
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
const ScanPage = lazy(() => import('@/features/attendance/pages/ScanPage'))
const WorkSchedulesPage = lazy(() => import('@/features/attendance/pages/WorkSchedulesPage'))
const AttendanceDevicesPage = lazy(() => import('@/features/attendance/pages/DevicesPage'))
const ExamsListPage = lazy(() => import('@/features/examinations/pages/ExamsListPage'))
const ExamDetailPage = lazy(() => import('@/features/examinations/pages/ExamDetailPage'))
const AdmitCardsPrintPage = lazy(() => import('@/features/examinations/pages/ExamPrintPages').then((m) => ({ default: m.AdmitCardsPrintPage })))
const SeatPlanPrintPage = lazy(() => import('@/features/examinations/pages/ExamPrintPages').then((m) => ({ default: m.SeatPlanPrintPage })))
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
const AssetLabelsPage = lazy(() => import('@/features/inventory/pages/AssetLabelsPage'))
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
const PendingApplicationsPage = lazy(() => import('@/features/applications/pages/ApplicationPages').then((m) => ({ default: m.PendingApplicationsPage })))
const AllApplicationsPage = lazy(() => import('@/features/applications/pages/ApplicationPages').then((m) => ({ default: m.AllApplicationsPage })))
const MyApplicationsPage = lazy(() => import('@/features/applications/pages/ApplicationPages').then((m) => ({ default: m.MyApplicationsPage })))
const ApplicationDetailPage = lazy(() => import('@/features/applications/pages/ApplicationPages').then((m) => ({ default: m.ApplicationDetailPage })))
const ApplicationTypesPage = lazy(() => import('@/features/applications/pages/TypesPage').then((m) => ({ default: m.TypesPage })))
const CertificatesPage = lazy(() => import('@/features/applications/pages/CertificatePages').then((m) => ({ default: m.CertificatesPage })))
const CertificatePage = lazy(() => import('@/features/applications/pages/CertificatePages').then((m) => ({ default: m.CertificatePage })))
const VacanciesPage = lazy(() => import('@/features/careers/pages/VacancyPages').then((m) => ({ default: m.VacanciesPage })))
const VacancyDetailPage = lazy(() => import('@/features/careers/pages/VacancyPages').then((m) => ({ default: m.VacancyDetailPage })))
const CandidatesPage = lazy(() => import('@/features/careers/pages/CandidatePages').then((m) => ({ default: m.CandidatesPage })))
const CandidatePage = lazy(() => import('@/features/careers/pages/CandidatePages').then((m) => ({ default: m.CandidatePage })))
const InterviewsPage = lazy(() => import('@/features/careers/pages/CandidatePages').then((m) => ({ default: m.InterviewsPage })))
const OffersPage = lazy(() => import('@/features/careers/pages/CandidatePages').then((m) => ({ default: m.OffersPage })))
const JobBoardPage = lazy(() => import('@/features/careers/pages/BoardPage').then((m) => ({ default: m.BoardPage })))
const AlumniListPage = lazy(() => import('@/features/alumni/pages/AlumniPages').then((m) => ({ default: m.AlumniListPage })))
const AlumnusPage = lazy(() => import('@/features/alumni/pages/AlumniPages').then((m) => ({ default: m.AlumnusPage })))
const AlumniImportPage = lazy(() => import('@/features/alumni/pages/AlumniImportPage'))
const MentorsPage = lazy(() => import('@/features/alumni/pages/AlumniPages').then((m) => ({ default: m.MentorsPage })))
const AlumniEventsPage = lazy(() => import('@/features/alumni/pages/GivingPages').then((m) => ({ default: m.AlumniEventsPage })))
const CampaignsPage = lazy(() => import('@/features/alumni/pages/GivingPages').then((m) => ({ default: m.CampaignsPage })))
const DonationsPage = lazy(() => import('@/features/alumni/pages/GivingPages').then((m) => ({ default: m.DonationsPage })))
const ApiKeysPage = lazy(() => import('@/features/settings/api-keys/ApiKeysPage'))
const AuditLogPage = lazy(() => import('@/features/audit/AuditLogPage'))
const SignupRequestsPage = lazy(() => import('@/features/platform/SignupRequestsPage'))
const TemplatesPage = lazy(() => import('@/features/settings/templates/TemplatesPage'))
const TripsPage = lazy(() => import('@/features/transport/pages/TripPages').then((m) => ({ default: m.TripsPage })))
const TripPage = lazy(() => import('@/features/transport/pages/TripPages').then((m) => ({ default: m.TripPage })))
const RoutesPage = lazy(() => import('@/features/transport/pages/RoutePages').then((m) => ({ default: m.RoutesPage })))
const RouteDetailPage = lazy(() => import('@/features/transport/pages/RoutePages').then((m) => ({ default: m.RouteDetailPage })))
const RidersPage = lazy(() => import('@/features/transport/pages/RoutePages').then((m) => ({ default: m.RidersPage })))
const VehiclesPage = lazy(() => import('@/features/transport/pages/FleetPages').then((m) => ({ default: m.VehiclesPage })))
const VehicleDetailPage = lazy(() => import('@/features/transport/pages/FleetPages').then((m) => ({ default: m.VehicleDetailPage })))
const CrewPage = lazy(() => import('@/features/transport/pages/FleetPages').then((m) => ({ default: m.CrewPage })))
const PlannedModulePage = lazy(() => import('@/pages/PlannedModulePage'))
const PublicAdmissionPage = lazy(() => import('@/features/public/pages/AdmissionPages').then((m) => ({ default: m.AdmissionPage })))
const PublicStatusPage = lazy(() => import('@/features/public/pages/AdmissionPages').then((m) => ({ default: m.StatusCheckPage })))
const PublicCareersPage = lazy(() => import('@/features/public/pages/CareersPages').then((m) => ({ default: m.PublicCareersPage })))
const PublicVacancyPage = lazy(() => import('@/features/public/pages/CareersPages').then((m) => ({ default: m.PublicVacancyPage })))
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
  handle: crumb(tr('Academics')),
  element: (
    <PermissionRoute permission={PERMS.academics.view}>
      <AcademicsLayout />
    </PermissionRoute>
  ),
  children: [
    { index: true, element: <Navigate to="programs" replace /> },
    { path: 'programs', handle: crumb(tr('Programs')), element: page(ProgramsPage) },
    { path: 'subjects', handle: crumb(tr('Subjects')), element: page(SubjectsPage) },
    { path: 'curriculum', handle: crumb(tr('Curriculum')), element: page(CurriculumPage) },
    { path: 'classes', handle: crumb(tr('Classes')), element: page(ClassesPage) },
    { path: 'electives', handle: crumb(tr('Electives')), element: page(ElectivesPage) },
    { path: 'teaching', handle: crumb(tr('Teaching')), element: page(TeachingPage) },
    { path: 'academic-years', handle: crumb(tr('Academic years')), element: page(AcademicYearsPage) },
    { path: 'terms', handle: crumb(tr('Terms')), element: page(TermsPage) },
    { path: 'rooms', handle: crumb(tr('Rooms')), element: page(RoomsPage) },
    { path: 'calendar', handle: crumb(tr('Calendar')), element: page(CalendarPage) },
    { path: 'departments', handle: crumb(tr('Departments')), element: page(DepartmentsPage) },
  ],
}

const studentsRoutes: RouteObject = {
  path: 'students',
  handle: crumb(tr('Students')),
  element: <PermissionRoute permission={PERMS.students.view} />,
  children: [
    { index: true, element: page(StudentsListPage) },
    { path: 'new', handle: crumb(tr('Add student')), element: page(StudentFormPage, PERMS.students.create) },
    { path: 'import', handle: crumb(tr('Import students')), element: page(StudentImportPage, PERMS.students.create) },
    { path: ':id', handle: crumb(tr('Student')), element: page(StudentDetailPage) },
    { path: ':id/edit', handle: crumb(tr('Edit')), element: page(StudentFormPage, PERMS.students.update) },
  ],
}

const admissionsRoutes: RouteObject = {
  path: 'admissions',
  handle: crumb(tr('Admissions')),
  element: <PermissionRoute permission={PERMS.admissions.view} />,
  children: [
    { index: true, element: page(AdmissionsListPage) },
    { path: ':id', handle: crumb(tr('Application')), element: page(AdmissionDetailPage) },
  ],
}

const parentsRoutes: RouteObject = {
  path: 'parents',
  handle: crumb(tr('Parents')),
  element: <PermissionRoute permission={PERMS.parents.view} />,
  children: [
    { index: true, element: page(ParentsListPage) },
    { path: ':id', handle: crumb(tr('Parent')), element: page(ParentDetailPage) },
  ],
}

const staffRoutes: RouteObject = {
  path: 'staff',
  handle: crumb(tr('Staff')),
  element: <PermissionRoute permission={PERMS.staff.view} />,
  children: [
    { index: true, element: page(StaffListPage) },
    { path: 'new', handle: crumb(tr('Add staff member')), element: page(StaffFormPage, PERMS.staff.create) },
    { path: 'import', handle: crumb(tr('Import staff')), element: page(StaffImportPage, PERMS.staff.create) },
    { path: ':id', handle: crumb(tr('Staff member')), element: page(StaffDetailPage) },
    { path: ':id/edit', handle: crumb(tr('Edit')), element: page(StaffFormPage, PERMS.staff.update) },
  ],
}

const usersRoutes: RouteObject = {
  path: 'users',
  handle: crumb(tr('Users')),
  element: <PermissionRoute permission={PERMS.users.view} />,
  children: [
    { index: true, element: page(UsersListPage) },
    { path: ':id', handle: crumb(tr('User')), element: page(UserDetailPage) },
  ],
}

const rolesRoutes: RouteObject = {
  path: 'roles',
  handle: crumb(tr('Roles')),
  element: <PermissionRoute permission={PERMS.roles.view} />,
  children: [
    { index: true, element: page(RolesListPage) },
    { path: 'new', handle: crumb(tr('New role')), element: page(RoleEditorPage, PERMS.roles.create) },
    { path: ':id', handle: crumb(tr('Role')), element: page(RoleEditorPage) },
  ],
}

// Every member may read notices; writing needs notices.manage.
const noticesRoutes: RouteObject = {
  path: 'notices',
  handle: crumb(tr('Notices')),
  children: [
    { index: true, element: page(NoticesListPage) },
    { path: 'new', handle: crumb(tr('Write a notice')), element: page(NoticePage, PERMS.notices.manage) },
    { path: ':id', handle: crumb(tr('Notice')), element: page(NoticePage) },
  ],
}

// Anyone may raise a ticket and follow their own; support.manage sees the office queue.
const supportRoutes: RouteObject = {
  path: 'support',
  handle: crumb(tr('Support')),
  children: [
    { index: true, element: <Navigate to="tickets" replace /> },
    { path: 'tickets', element: page(TicketsListPage) },
    { path: 'tickets/:id', handle: crumb(tr('Ticket')), element: page(TicketDetailPage) },
  ],
}

// Everyone has conversations; who may start one or publish slots is checked in place.
const messagesRoutes: RouteObject = {
  path: 'messages',
  handle: crumb(tr('Messages')),
  children: [
    { index: true, element: page(MessagesPage) },
    { path: 'appointments', handle: crumb(tr('Appointments')), element: page(AppointmentsPage) },
    { path: ':threadId', handle: crumb(tr('Conversation')), element: page(MessagesPage) },
  ],
}

const eventsRoutes: RouteObject = {
  path: 'events',
  handle: crumb(tr('Events')),
  element: <PermissionRoute permission={PERMS.events.view} />,
  children: [
    {
      element: <EventsLayout />,
      children: [
        { index: true, element: page(EventsListPage) },
        { path: 'leaderboard', handle: crumb(tr('Leaderboard')), element: page(LeaderboardPage) },
        { path: 'awards', handle: crumb(tr('Awards')), element: page(AwardsPage) },
        { path: 'point-rules', handle: crumb(tr('Point rules')), element: page(PointRulesPage) },
        { path: 'categories', handle: crumb(tr('Categories')), element: page(EventCategoriesPage) },
      ],
    },
    { path: ':id', handle: crumb(tr('Event')), element: page(EventDetailPage) },
  ],
}

const timetableRoutes: RouteObject = {
  path: 'timetable',
  handle: crumb(tr('Timetable')),
  element: (
    <PermissionRoute permission={PERMS.timetable.view}>
      <TimetableLayout />
    </PermissionRoute>
  ),
  children: [
    { index: true, element: page(WeekPage) },
    { path: 'day', handle: crumb(tr('Day')), element: page(DayPage) },
    { path: 'lesson-changes', handle: crumb(tr('Lesson changes')), element: page(LessonChangesPage) },
    { path: 'bell-schedules', handle: crumb(tr('Bell schedules')), element: page(BellSchedulesPage) },
  ],
}

// Teachers with only attendance.mark get Today and the roll call; the rest is the office's.
const attendanceRoutes: RouteObject = {
  path: 'attendance',
  handle: crumb(tr('Attendance')),
  element: <PermissionRoute permission={{ any: [PERMS.attendance.view, PERMS.attendance.mark] }} />,
  children: [
    {
      element: <AttendanceLayout />,
      children: [
        { index: true, element: page(AttendanceTodayPage) },
        { path: 'sessions', handle: crumb(tr('Sessions')), element: page(AttendanceSessionsPage, PERMS.attendance.view) },
        { path: 'reports', handle: crumb(tr('Reports')), element: page(AttendanceReportsPage, PERMS.attendance.view) },
        { path: 'staff', handle: crumb(tr('Staff')), element: page(StaffAttendancePage, PERMS.attendance.view) },
        { path: 'schedules', handle: crumb(tr('Work schedules')), element: page(WorkSchedulesPage, PERMS.attendance.view) },
        { path: 'devices', handle: crumb(tr('Devices')), element: page(AttendanceDevicesPage, PERMS.attendance.devices) },
      ],
    },
    { path: 'sessions/:id', handle: crumb(tr('Roll call')), element: page(RollCallPage) },
  ],
}

// Teachers with only exams.mark get their mark sheets; the rest is the exam office's.
const examinationsRoutes: RouteObject = {
  path: 'examinations',
  handle: crumb(tr('Examinations')),
  element: <PermissionRoute permission={{ any: [PERMS.exams.view, PERMS.exams.mark] }} />,
  children: [
    {
      element: <ExamsLayout />,
      children: [
        { index: true, element: <ExamsIndexGate>{page(ExamsListPage)}</ExamsIndexGate> },
        { path: 'mark-sheets', handle: crumb(tr('Mark sheets')), element: page(MarkSheetsPage) },
        { path: 'results', handle: crumb(tr('Results')), element: page(ResultsPage, PERMS.exams.view) },
        { path: 'term-results', handle: crumb(tr('Term results')), element: page(TermResultsPage, PERMS.exams.view) },
        { path: 'report-cards', handle: crumb(tr('Report cards')), element: page(ReportCardsPage, PERMS.exams.view) },
        { path: 'transcripts', handle: crumb(tr('Transcripts')), element: page(TranscriptsPage, PERMS.exams.view) },
        { path: 'grades', handle: crumb(tr('Grade scales')), element: page(GradeScalesPage, PERMS.grades.view) },
        { path: 'types', handle: crumb(tr('Exam types')), element: page(ExamTypesPage, PERMS.exams.view) },
      ],
    },
    { path: 'mark-sheets/:id', handle: crumb(tr('Marks')), element: page(MarkEntryPage) },
    { path: ':id', handle: crumb(tr('Exam')), element: page(ExamDetailPage, PERMS.exams.view) },
    { path: ':id/admit-cards/print', handle: crumb(tr('Print admit cards')), element: page(AdmitCardsPrintPage, PERMS.exams.view) },
    { path: ':id/seating/print', handle: crumb(tr('Print seat plan')), element: page(SeatPlanPrintPage, PERMS.exams.view) },
  ],
}

// Every finance list needs finance.view; a cashier also needs it to find invoices to take payments on.
const financeRoutes: RouteObject = {
  path: 'finance',
  handle: crumb(tr('Finance')),
  element: <PermissionRoute permission={PERMS.finance.view} />,
  children: [
    {
      element: <FinanceLayout />,
      children: [
        { index: true, element: page(FinanceOverviewPage) },
        { path: 'invoices', handle: crumb(tr('Invoices')), element: page(InvoicesPage) },
        { path: 'payments', handle: crumb(tr('Payments')), element: page(PaymentsPage) },
        { path: 'fees', handle: crumb(tr('Fee structures')), element: page(FeeStructuresPage) },
        { path: 'scholarships', handle: crumb(tr('Scholarships')), element: page(ScholarshipsPage) },
        { path: 'reports', handle: crumb(tr('Reports')), element: page(FinanceReportsPage) },
      ],
    },
    { path: 'invoices/:id', handle: crumb(tr('Invoice')), element: page(InvoiceDetailPage) },
    { path: 'payments/:id', handle: crumb(tr('Receipt')), element: page(ReceiptPage) },
  ],
}

// Browsing the catalog is open to staff; the desk and memberships need library permissions.
// Loans, reservations and fines lists are scoped by the backend (staff see their branch, members their own).
const libraryRoutes: RouteObject = {
  path: 'library',
  handle: crumb(tr('Library')),
  element: <PermissionRoute permission={{ any: [PERMS.library.circulate, PERMS.library.manage] }} />,
  children: [
    {
      element: <LibraryLayout />,
      children: [
        { index: true, element: page(LibraryDeskPage) },
        { path: 'books', handle: crumb(tr('Books')), element: page(LibraryBooksPage) },
        { path: 'members', handle: crumb(tr('Members')), element: page(LibraryMembersPage, PERMS.library.manage) },
        { path: 'loans', handle: crumb(tr('Loans')), element: page(LibraryLoansPage) },
        { path: 'reservations', handle: crumb(tr('Reservations')), element: page(LibraryReservationsPage) },
        { path: 'fines', handle: crumb(tr('Fines')), element: page(LibraryFinesPage) },
        { path: 'setup', handle: crumb(tr('Catalog setup')), element: page(LibrarySetupPage, PERMS.library.manage) },
      ],
    },
    { path: 'books/:id', handle: crumb(tr('Book')), element: page(LibraryBookPage) },
  ],
}

const inventoryRoutes: RouteObject = {
  path: 'inventory',
  handle: crumb(tr('Inventory')),
  element: <PermissionRoute permission={PERMS.inventory.view} />,
  children: [
    {
      element: <InventoryLayout />,
      children: [
        { index: true, element: page(InventoryStockPage) },
        { path: 'items', handle: crumb(tr('Items')), element: page(InventoryItemsPage) },
        { path: 'purchases', handle: crumb(tr('Purchases')), element: page(PurchasesPage) },
        { path: 'assets', handle: crumb(tr('Assets')), element: page(AssetsPage) },
        { path: 'assignments', handle: crumb(tr('Assignments')), element: page(AssignmentsPage) },
        { path: 'maintenance', handle: crumb(tr('Maintenance')), element: page(MaintenancePage) },
        { path: 'categories', handle: crumb(tr('Categories & stores')), element: page(InventorySetupPage) },
      ],
    },
    { path: 'purchases/:id', handle: crumb(trc('purchase', 'Order')), element: page(PurchaseDetailPage) },
    { path: 'assets/labels', handle: crumb(tr('Asset labels')), element: page(AssetLabelsPage) },
    { path: 'assets/:id', handle: crumb(tr('Asset')), element: page(AssetDetailPage) },
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
    { path: 'leave', handle: crumb(tr('Leave balances')), element: page(LeaveBalancesPage, PERMS.hr.view) },
    { path: 'contracts', handle: crumb(tr('Contracts')), element: page(ContractsPage, PERMS.hr.view) },
    { path: 'profiles', handle: crumb(tr('HR profiles')), element: page(HrProfilesPage, PERMS.hr.view) },
    { path: 'documents', handle: crumb(tr('Documents')), element: page(HrDocumentsPage, PERMS.hr.view) },
    { path: 'setup', handle: crumb(tr('Setup')), element: page(HrSetupPage, PERMS.hr.view) },
    // Staff attendance lives with the rest of attendance.
    { path: 'attendance', element: <Navigate to="/attendance/staff" replace /> },
  ],
}

const payrollRoutes: RouteObject = {
  path: 'payroll',
  handle: crumb(tr('Payroll')),
  element: <PermissionRoute permission={PERMS.payroll.view} />,
  children: [
    {
      element: <PayrollLayout />,
      children: [
        { index: true, element: page(PayrollRunsPage) },
        { path: 'payslips', handle: crumb(tr('Payslips')), element: page(PayslipsPage) },
        { path: 'salaries', handle: crumb(tr('Salaries')), element: page(SalariesPage) },
        { path: 'adjustments', handle: crumb(tr('Adjustments')), element: page(PayrollAdjustmentsPage) },
        { path: 'setup', handle: crumb(tr('Setup')), element: page(PayrollSetupPage) },
      ],
    },
    { path: 'runs', element: <Navigate to="/payroll" replace /> },
    { path: 'runs/:id', handle: crumb(tr('Run')), element: page(PayrollRunPage) },
    { path: 'payslips/:id', handle: crumb(tr('Payslip')), element: page(PayslipPage) },
  ],
}

// Anyone may apply, follow their own, and decide the steps their role holds.
// Self-service: everyone may open these; each endpoint returns only the caller's own records.
const selfRoutes: RouteObject = {
  path: 'me',
  handle: crumb(tr('My account')),
  children: [
    {
      element: <SelfLayout />,
      children: [
        { index: true, element: page(ProfilePage) },
        { path: 'timetable', handle: crumb(tr('Timetable')), element: page(SelfMyTimetablePage) },
        { path: 'attendance', handle: crumb(tr('Attendance')), element: page(SelfMyAttendancePage) },
        { path: 'mark-sheets', handle: crumb(tr('Marking')), element: page(SelfMyMarkingPage, PERMS.exams.mark) },
        { path: 'leave', handle: crumb(tr('Leave')), element: page(SelfMyLeavePage) },
        { path: 'payslips', handle: crumb(tr('Payslips')), element: page(SelfMyPayslipsPage) },
        { path: 'employment', handle: crumb(tr('Employment')), element: page(SelfMyEmploymentPage) },
        { path: 'contracts', element: <Navigate to="/me/employment" replace /> },
        { path: 'assets', handle: crumb(tr('Assets')), element: page(SelfMyAssetsPage) },
        { path: 'transport', handle: crumb(tr('Transport')), element: page(SelfMyTransportPage) },
        { path: 'hostel', handle: crumb(tr('Hostel')), element: page(SelfMyHostelPage) },
        { path: 'library', handle: crumb(tr('Library')), element: page(SelfMyLibraryPage) },
        { path: 'interviews', handle: crumb(tr('Interviews')), element: page(SelfMyInterviewsPage) },
        { path: 'jobs', handle: crumb(tr('Jobs')), element: page(SelfMyJobsPage) },
        { path: 'exams', handle: crumb(tr('Exams')), element: page(SelfMyExamsPage) },
        { path: 'results', handle: crumb(tr('Results')), element: page(SelfMyResultsPage) },
        { path: 'report-card', element: <Navigate to="/me/results" replace /> },
        { path: 'transcript', element: <Navigate to="/me/results" replace /> },
        { path: 'fees', handle: crumb(tr('Fees')), element: page(SelfMyFeesPage) },
        { path: 'events', handle: crumb(tr('Events')), element: page(SelfMyEventsPage) },
        { path: 'certificates', handle: crumb(tr('Certificates')), element: page(SelfMyCertificatesPage) },
        { path: 'mentoring', handle: crumb(tr('Mentoring')), element: page(SelfMyMentoringPage) },
        { path: 'alumni-events', handle: crumb(tr('Alumni events')), element: page(SelfMyAlumniEventsPage) },
        { path: 'applications', handle: crumb(tr('Applications')), element: page(SelfMyApplicationsPage) },
        { path: 'profile', element: <Navigate to="/me" replace /> },
        // Printable documents; the tabs and header don't print.
        { path: 'payslips/:id', handle: crumb(tr('Payslip')), element: page(SelfMyPayslipPage) },
        { path: 'exams/:examId/admit-card', handle: crumb(tr('Admit card')), element: page(SelfMyAdmitCardPage) },
        { path: 'certificates/:id', handle: crumb(tr('Certificate')), element: page(SelfMyCertificatePage) },
      ],
    },
  ],
}

const applicationsRoutes: RouteObject = {
  path: 'applications',
  handle: crumb(tr('Applications')),
  children: [
    {
      element: <ApplicationsLayout />,
      children: [
        { index: true, element: page(PendingApplicationsPage) },
        { path: 'pending', element: <Navigate to="/applications" replace /> },
        { path: 'all', handle: crumb(tr('All')), element: page(AllApplicationsPage, PERMS.applications.view) },
        { path: 'mine', handle: crumb(tr('Mine')), element: page(MyApplicationsPage) },
        { path: 'types', handle: crumb(tr('Forms')), element: page(ApplicationTypesPage, PERMS.applications.view) },
      ],
    },
    { path: ':id', handle: crumb(tr('Application')), element: page(ApplicationDetailPage) },
  ],
}

const certificatesRoutes: RouteObject = {
  path: 'certificates',
  handle: crumb(tr('Certificates')),
  element: <PermissionRoute permission={{ any: [PERMS.applications.view, PERMS.applications.certify] }} />,
  children: [
    { index: true, element: page(CertificatesPage) },
    { path: 'templates', element: <Navigate to="/applications/types?kind=certificate" replace /> },
    { path: 'requests', element: <Navigate to="/applications/all?application_type__kind=certificate" replace /> },
    { path: ':id', handle: crumb(tr('Certificate')), element: page(CertificatePage) },
  ],
}

const careersRoutes: RouteObject = {
  path: 'careers',
  handle: crumb(tr('Careers')),
  element: <PermissionRoute permission={PERMS.careers.view} />,
  children: [
    {
      element: <CareersLayout />,
      children: [
        { index: true, element: page(VacanciesPage) },
        { path: 'applications', handle: crumb(tr('Candidates')), element: page(CandidatesPage) },
        { path: 'interviews', handle: crumb(tr('Interviews')), element: page(InterviewsPage) },
        { path: 'offers', handle: crumb(tr('Offers')), element: page(OffersPage) },
        { path: 'board', handle: crumb(tr('Job board')), element: page(JobBoardPage) },
      ],
    },
    { path: 'vacancies', element: <Navigate to="/careers" replace /> },
    { path: 'vacancies/:id', handle: crumb(tr('Vacancy')), element: page(VacancyDetailPage) },
    { path: 'applications/:id', handle: crumb(tr('Candidate')), element: page(CandidatePage) },
  ],
}

const alumniRoutes: RouteObject = {
  path: 'alumni',
  handle: crumb(tr('Alumni')),
  element: <PermissionRoute permission={PERMS.alumni.view} />,
  children: [
    {
      element: <AlumniLayout />,
      children: [
        { index: true, element: page(AlumniListPage) },
        { path: 'directory', element: <Navigate to="/alumni?directory_visible=true" replace /> },
        { path: 'mentors', handle: crumb(tr('Mentors')), element: page(MentorsPage) },
        { path: 'events', handle: crumb(tr('Events')), element: page(AlumniEventsPage) },
        { path: 'campaigns', handle: crumb(tr('Campaigns')), element: page(CampaignsPage) },
        { path: 'donations', handle: crumb(tr('Donations')), element: page(DonationsPage) },
      ],
    },
    { path: 'import', handle: crumb(tr('Import alumni')), element: page(AlumniImportPage, PERMS.alumni.manage) },
    { path: ':id', handle: crumb(tr('Alumnus')), element: page(AlumnusPage) },
  ],
}

const hostelRoutes: RouteObject = {
  path: 'hostel',
  handle: crumb(tr('Hostel')),
  element: (
    <PermissionRoute permission={PERMS.hostel.view}>
      <HostelLayout />
    </PermissionRoute>
  ),
  children: [
    { index: true, element: page(HostelBoardPage) },
    { path: 'allocations', handle: crumb(tr('Allocations')), element: page(HostelAllocationsPage) },
    { path: 'rooms', handle: crumb(tr('Rooms & beds')), element: page(HostelRoomsPage) },
    { path: 'beds', element: <Navigate to="/hostel" replace /> },
    { path: 'buildings', handle: crumb(tr('Buildings')), element: page(HostelBuildingsPage) },
    { path: 'complaints', handle: crumb(tr('Complaints')), element: page(HostelComplaintsPage) },
  ],
}

// The crew can run their own route's trips without transport.view; those screens come with self-service.
const transportRoutes: RouteObject = {
  path: 'transport',
  handle: crumb(tr('Transport')),
  element: <PermissionRoute permission={PERMS.transport.view} />,
  children: [
    {
      element: <TransportLayout />,
      children: [
        { index: true, element: page(TripsPage) },
        { path: 'routes', handle: crumb(tr('Routes & stops')), element: page(RoutesPage) },
        { path: 'stops', element: <Navigate to="/transport/routes" replace /> },
        { path: 'assignments', handle: crumb(tr('Riders')), element: page(RidersPage) },
        { path: 'vehicles', handle: crumb(tr('Vehicles')), element: page(VehiclesPage) },
        { path: 'crew', handle: crumb(tr('Crew')), element: page(CrewPage) },
      ],
    },
    { path: 'trips', element: <Navigate to="/transport" replace /> },
    { path: 'trips/:id', handle: crumb(tr('Trip')), element: page(TripPage) },
    { path: 'routes/:id', handle: crumb(tr('Route')), element: page(RouteDetailPage) },
    { path: 'vehicles/:id', handle: crumb(tr('Vehicle')), element: page(VehicleDetailPage) },
  ],
}

const settingsRoutes: RouteObject = {
  path: 'settings',
  handle: crumb(tr('Settings')),
  children: [
    { index: true, element: page(SettingsPage) },
    { path: 'organization', handle: crumb(tr('Organization')), element: page(OrganizationSettingsPage, PERMS.organizations.view) },
    { path: 'branches', handle: crumb(tr('Branches')), element: page(BranchesPage, PERMS.campuses.view) },
    { path: 'setup', handle: crumb(tr('Setup')), element: page(SetupWizardPage, PERMS.organizations.update) },
    { path: 'api-keys', handle: crumb(tr('API keys')), element: page(ApiKeysPage, PERMS.apiKeys.manage) },
    { path: 'templates', handle: crumb(tr('Templates')), element: page(TemplatesPage, { any: [PERMS.grades.manage, PERMS.finance.manage, PERMS.hr.manage, PERMS.applications.manage] }) },
  ],
}

export const router = createBrowserRouter([
  { path: '/login', element: page(LoginPage) },
  { path: '/forgot-password', element: page(ForgotPasswordPage) },
  { path: '/reset-password', element: page(ResetPasswordPage) },
  { path: '/signup', element: page(SignupPage) },
  { path: '/signup/verify', element: page(SignupVerifyPage) },
  { path: '/terms', element: page(TermsOfServicePage) },
  { path: '/privacy', element: page(PrivacyPage) },
  {
    path: '/public/:organizationCode',
    children: [
      { index: true, element: <Navigate to="admission" replace /> },
      { path: 'admission', element: page(PublicAdmissionPage) },
      { path: 'admission/status', element: page(PublicStatusPage) },
      { path: 'careers', element: page(PublicCareersPage) },
      { path: 'careers/:id', element: page(PublicVacancyPage) },
      { path: 'application/status', element: page(PublicStatusPage) },
    ],
  },
  {
    element: <ProtectedRoute />,
    errorElement: <ServerError />,
    children: [
      // Opened by a phone's camera from an attendance QR code: no sidebar, just the result.
      { path: '/scan/:kind', element: page(ScanPage) },
      {
        path: '/',
        element: <ProtectedLayout />,
        errorElement: <ServerError />,
        handle: crumb(tr('Dashboard')),
        children: [
          { index: true, element: page(DashboardPage) },
          selfRoutes,
          { path: 'notifications', handle: crumb(tr('Notifications')), element: page(NotificationsPage) },
          { path: 'audit', handle: crumb(tr('Audit log')), element: page(AuditLogPage, PERMS.audit.view) },
          { path: 'platform/signup-requests', handle: crumb(tr('Signup requests')), element: page(SignupRequestsPage, PERMS.platform.admin) },
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
          applicationsRoutes,
          certificatesRoutes,
          careersRoutes,
          alumniRoutes,
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
