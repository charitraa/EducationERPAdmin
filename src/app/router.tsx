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
