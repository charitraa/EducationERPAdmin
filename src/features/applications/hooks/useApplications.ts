import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import type { Id, ListParams } from '@/shared/types/api'
import { applicationKeys, applicationsApi, certificateKeys, certificatesApi, typeKeys, typesApi } from '../api/applications.api'

export const { useList: useApplicationTypes, useCreate: useCreateApplicationType, useUpdate: useUpdateApplicationType, useRemove: useRemoveApplicationType } = createResourceHooks(typesApi, typeKeys)

export function useAvailableTypes(enabled = true) {
  return useQuery({ queryKey: [...typeKeys.all, 'available'], queryFn: typesApi.available, staleTime: 5 * 60_000, enabled })
}

export function useApplications(params: ListParams, enabled = true) {
  return useQuery({ queryKey: applicationKeys.list(params), queryFn: () => applicationsApi.list(params), placeholderData: keepPreviousData, enabled })
}
export function usePendingApplications(params: ListParams) {
  return useQuery({ queryKey: [...applicationKeys.lists(), 'pending', params], queryFn: () => applicationsApi.pending(params), placeholderData: keepPreviousData })
}
export function useMyApplications(params: ListParams) {
  return useQuery({ queryKey: [...applicationKeys.lists(), 'mine', params], queryFn: () => applicationsApi.mine(params), placeholderData: keepPreviousData })
}
export function useApplication(id: Id | null) {
  return useQuery({ queryKey: applicationKeys.detail(id ?? 0), queryFn: () => applicationsApi.get(id!), enabled: id != null })
}

// A final approval acts in another module (a bed, a leave, a certificate), so refresh broadly.
function useDecision<V, R>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    meta: { form: true },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: applicationKeys.all })
      void qc.invalidateQueries({ queryKey: certificateKeys.all })
    },
  })
}
export const useSubmitApplication = () => useDecision(applicationsApi.submit)
export const useApproveApplication = () => useDecision(({ id, ...input }: { id: Id; note?: string; decision?: Record<string, unknown> }) => applicationsApi.approve(id, input))
export const useRejectApplication = () => useDecision(({ id, note }: { id: Id; note: string }) => applicationsApi.reject(id, note))
export const useSendBackApplication = () => useDecision(({ id, note }: { id: Id; note: string }) => applicationsApi.sendBack(id, note))
export const useResubmitApplication = () => useDecision(({ id, ...input }: { id: Id; data: Record<string, unknown>; note?: string }) => applicationsApi.resubmit(id, input))
export const useWithdrawApplication = () => useDecision(({ id, note }: { id: Id; note?: string }) => applicationsApi.withdraw(id, note))

export function useCertificates(params: ListParams) {
  return useQuery({ queryKey: certificateKeys.list(params), queryFn: () => certificatesApi.list(params), placeholderData: keepPreviousData })
}
export function useCertificate(id: Id | null) {
  return useQuery({ queryKey: certificateKeys.detail(id ?? 0), queryFn: () => certificatesApi.get(id!), enabled: id != null })
}
export const useIssueCertificate = () => useDecision(certificatesApi.issue)
export const useRevokeCertificate = () => useDecision(({ id, reason }: { id: Id; reason: string }) => certificatesApi.revoke(id, reason))
