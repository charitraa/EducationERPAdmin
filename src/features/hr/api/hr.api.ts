import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, ListParams, Paginated, Schema } from '@/shared/types/api'

export type Position = Schema<'Position'>
export type Contract = Schema<'Contract'>
export type ContractInput = Schema<'ContractRequest'>
export type EmployeeProfile = Schema<'EmployeeProfile'>
export type EmployeeProfileInput = Schema<'EmployeeProfileRequest'>
export type StaffDocument = Schema<'StaffDocument'>
export type StaffDocumentInput = Schema<'StaffDocumentRequest'>
export type FiscalYear = Schema<'FiscalYear'>
export type LeaveType = Schema<'LeaveType'>
export type LeaveTypeInput = Schema<'LeaveTypeRequest'>
export type LeaveBalance = Schema<'LeaveBalance'>
export type LeaveRequest = Schema<'LeaveRequest'>

const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)

export const positionsApi = createResourceApi<Position, Schema<'PositionRequest'>>('/hr/positions/')
export const positionKeys = createQueryKeys('hr-positions')
export const fiscalYearsApi = createResourceApi<FiscalYear, Schema<'FiscalYearRequest'>>('/hr/fiscal-years/')
export const fiscalYearKeys = createQueryKeys('hr-fiscal-years')
export const leaveTypesApi = createResourceApi<LeaveType, LeaveTypeInput>('/hr/leave-types/')
export const leaveTypeKeys = createQueryKeys('hr-leave-types')
export const profilesApi = createResourceApi<EmployeeProfile, EmployeeProfileInput>('/hr/profiles/')
export const profileKeys = createQueryKeys('hr-profiles')
export const documentsApi = createResourceApi<StaffDocument, StaffDocumentInput>('/hr/documents/')
export const documentKeys = createQueryKeys('hr-documents')

export const contractsApi = {
  ...createResourceApi<Contract, ContractInput>('/hr/contracts/'),
  /** Ends on `end_date` (inclusive); a contract that has started can't be deleted. */
  end: (id: Id, input: { end_date: string; reason?: string }) => post<Contract>(`/hr/contracts/${id}/end/`, input),
}
export const contractKeys = createQueryKeys('hr-contracts')

export const balancesApi = {
  list: createResourceApi<LeaveBalance>('/hr/leave-balances/').list,
  adjust: (id: Id, input: { delta: string; reason: string }) => post<LeaveBalance>(`/hr/leave-balances/${id}/adjust/`, input),
  /** Entitlements and carry-forward for every staff member; existing balances are left alone. */
  open: (input: { fiscal_year: Id; campus?: Id | null }) => post<{ created: number; existing: number }>('/hr/leave-balances/open/', input),
  mine: () => apiClient.get<LeaveBalance[]>('/hr/leave-balances/me/').then((r) => r.data),
}
export const balanceKeys = createQueryKeys('hr-leave-balances')

export interface ApplyLeaveInput {
  leave_type: Id
  start_date: string
  end_date: string
  half_day?: boolean
  reason?: string
}

export const leaveRequestsApi = {
  list: createResourceApi<LeaveRequest>('/hr/leave-requests/').list,
  get: createResourceApi<LeaveRequest>('/hr/leave-requests/').get,
  pending: (params: ListParams = {}) => apiClient.get<Paginated<LeaveRequest>>('/hr/leave-requests/pending/', { params }).then((r) => r.data),
  /** HR, on a staff member's behalf. */
  create: (input: ApplyLeaveInput & { staff: Id }) => post<LeaveRequest>('/hr/leave-requests/', input),
  approve: (id: Id, note?: string) => post<LeaveRequest>(`/hr/leave-requests/${id}/approve/`, { note: note ?? '' }),
  reject: (id: Id, note: string) => post<LeaveRequest>(`/hr/leave-requests/${id}/reject/`, { note }),
  cancel: (id: Id) => post<LeaveRequest>(`/hr/leave-requests/${id}/cancel/`),
  mine: (status?: string) => apiClient.get<LeaveRequest[]>('/hr/leave-requests/me/', { params: { status } }).then((r) => r.data),
  apply: (input: ApplyLeaveInput) => post<LeaveRequest>('/hr/leave-requests/me/', input),
}
export const leaveRequestKeys = createQueryKeys('hr-leave-requests')
