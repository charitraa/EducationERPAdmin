import { lazy, Suspense, type ComponentType, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom'
import { PageLoader } from '@/components/data-display/LoadingState'
import type { PermissionRequirement } from '@/lib/permissions'
import { en } from '@/locales/en'
import { PERMS } from '@/shared/constants/permissions'
import { AcademicsLayout } from '@/features/academics/AcademicsLayout'
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
