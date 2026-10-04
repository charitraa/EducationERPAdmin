import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { todayIso } from '@/lib/dates'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id, ListParams } from '@/shared/types/api'
import {
  balanceKeys,
  balancesApi,
  contractKeys,
  contractsApi,
  documentKeys,
  documentsApi,
  fiscalYearKeys,
  fiscalYearsApi,
  leaveRequestKeys,
  leaveRequestsApi,
  leaveTypeKeys,
  leaveTypesApi,
  positionKeys,
  positionsApi,
  profileKeys,
  profilesApi,
  type ApplyLeaveInput,
} from '../api/hr.api'

export const { useList: usePositions, useCreate: useCreatePosition, useUpdate: useUpdatePosition, useRemove: useRemovePosition } = createResourceHooks(positionsApi, positionKeys)
export const { useList: useFiscalYears, useCreate: useCreateFiscalYear, useUpdate: useUpdateFiscalYear, useRemove: useRemoveFiscalYear } = createResourceHooks(fiscalYearsApi, fiscalYearKeys)
export const { useList: useLeaveTypes, useCreate: useCreateLeaveType, useUpdate: useUpdateLeaveType, useRemove: useRemoveLeaveType } = createResourceHooks(leaveTypesApi, leaveTypeKeys)
export const { useList: useProfiles, useCreate: useCreateProfile, useUpdate: useUpdateProfile, useRemove: useRemoveProfile } = createResourceHooks(profilesApi, profileKeys)
export const { useList: useStaffDocuments, useCreate: useCreateStaffDocument, useUpdate: useUpdateStaffDocument, useRemove: useRemoveStaffDocument } = createResourceHooks(documentsApi, documentKeys)
export const { useList: useContracts, useCreate: useCreateContract, useUpdate: useUpdateContract, useRemove: useRemoveContract } = createResourceHooks(contractsApi, contractKeys)

export function useEndContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: Id; end_date: string; reason?: string }) => contractsApi.end(id, input),
    meta: { form: true },
    onSuccess: () => void qc.invalidateQueries({ queryKey: contractKeys.all }),
  })
}

export function usePositionOptions() {
  const q = usePositions({ ...PICKER_PARAMS, is_active: true })
  return (q.data?.results ?? []).map((p) => ({ value: String(p.id), label: p.name }))
}

/** Fiscal years, newest first, with the one covering today picked out. */
export function useFiscalYearOptions() {
  const q = useFiscalYears({ ...PICKER_PARAMS })
  const years = q.data?.results ?? []
  const today = todayIso()
  const current = years.find((y) => y.start_date <= today && today <= y.end_date)
  return { years, current, isPending: q.isPending, options: years.map((y) => ({ value: String(y.id), label: y.name })) }
}

export function useLeaveTypeOptions(activeOnly = true) {
  const q = useLeaveTypes({ ...PICKER_PARAMS, ...(activeOnly ? { is_active: true } : {}) })
  return { types: q.data?.results ?? [], options: (q.data?.results ?? []).map((t) => ({ value: String(t.id), label: t.name })) }
}

// Leave decisions move days between balances and write staff attendance.
const LEAVE = [leaveRequestKeys.all, balanceKeys.all, ['attendance-staff-days']]
function useLeave<V, R>(fn: (v: V) => Promise<R>, form = true) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    meta: form ? { form: true } : { silent: true },
    onSuccess: () => {
      for (const key of LEAVE) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

export function useLeaveRequests(params: ListParams, enabled = true) {
  return useQuery({ queryKey: leaveRequestKeys.list(params), queryFn: () => leaveRequestsApi.list(params), placeholderData: keepPreviousData, enabled })
}
export function usePendingLeave(params: ListParams, enabled = true) {
  return useQuery({ queryKey: [...leaveRequestKeys.lists(), 'pending', params], queryFn: () => leaveRequestsApi.pending(params), placeholderData: keepPreviousData, enabled })
}
export function useMyLeave() {
  return useQuery({ queryKey: [...leaveRequestKeys.all, 'mine'], queryFn: () => leaveRequestsApi.mine(), retry: false })
}
export const useApplyLeaveFor = () => useLeave((input: ApplyLeaveInput & { staff: Id }) => leaveRequestsApi.create(input))
export const useApplyLeave = () => useLeave(leaveRequestsApi.apply)
export const useApproveLeave = () => useLeave(({ id, note }: { id: Id; note?: string }) => leaveRequestsApi.approve(id, note))
export const useRejectLeave = () => useLeave(({ id, note }: { id: Id; note: string }) => leaveRequestsApi.reject(id, note))
export const useCancelLeave = () => useLeave(leaveRequestsApi.cancel, false)

export function useLeaveBalances(params: ListParams, enabled = true) {
  return useQuery({ queryKey: balanceKeys.list(params), queryFn: () => balancesApi.list(params), placeholderData: keepPreviousData, enabled })
}
export function useMyBalances() {
  return useQuery({ queryKey: [...balanceKeys.all, 'mine'], queryFn: balancesApi.mine, retry: false })
}
export const useAdjustBalance = () => useLeave(({ id, ...input }: { id: Id; delta: string; reason: string }) => balancesApi.adjust(id, input))
export const useOpenBalances = () => useLeave(balancesApi.open)
