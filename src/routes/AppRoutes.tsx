import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthBootstrap } from '@/features/auth/useAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { OrganizationsListPage } from '@/features/organizations/OrganizationsListPage'
import { CampusesListPage } from '@/features/campuses/CampusesListPage'
import { UsersListPage } from '@/features/users/UsersListPage'
import { UserDetailPage } from '@/features/users/UserDetailPage'
import { RolesListPage } from '@/features/roles/RolesListPage'
import { AuditLogPage } from '@/features/audit/AuditLogPage'
import { StudentsListPage } from '@/features/students/StudentsListPage'
import { StudentDetailPage } from '@/features/students/StudentDetailPage'
import { StaffListPage } from '@/features/staff/StaffListPage'
import { StaffDetailPage } from '@/features/staff/StaffDetailPage'
import { ParentsListPage } from '@/features/parents/ParentsListPage'
import { ParentDetailPage } from '@/features/parents/ParentDetailPage'
import { AdmissionsListPage } from '@/features/admissions/AdmissionsListPage'
import { AdmissionDetailPage } from '@/features/admissions/AdmissionDetailPage'

export function AppRoutes() {
  useAuthBootstrap()

  // TEMP: auth/permission gating (ProtectedRoute, PermissionRoute — both in
  // ./ProtectedRoute.tsx) is stripped out so every page can be clicked
  // through without a login. Re-wrap the AppShell route with
  // <Route element={<ProtectedRoute />}> and per-section
  // <Route element={<PermissionRoute any={[...]}>}> once ready — the nav
  // sidebar (components/layout/Sidebar.tsx) has a matching TEMP note.
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />

        <Route path="students" element={<StudentsListPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />

        <Route path="staff" element={<StaffListPage />} />
        <Route path="staff/:id" element={<StaffDetailPage />} />

        <Route path="parents" element={<ParentsListPage />} />
        <Route path="parents/:id" element={<ParentDetailPage />} />

        <Route path="admissions" element={<AdmissionsListPage />} />
        <Route path="admissions/:id" element={<AdmissionDetailPage />} />

        <Route path="organizations" element={<OrganizationsListPage />} />
        <Route path="campuses" element={<CampusesListPage />} />
        <Route path="users" element={<UsersListPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="roles" element={<RolesListPage />} />
        <Route path="audit-log" element={<AuditLogPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
