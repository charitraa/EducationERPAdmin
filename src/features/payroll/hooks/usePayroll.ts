import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id, ListParams } from '@/shared/types/api'
import {
  adjustmentKeys,
  adjustmentsApi,
  componentKeys,
  componentsApi,
  payslipKeys,
  payslipsApi,
  runKeys,
  runsApi,
  salariesApi,
  salaryKeys,
  settingsApi,
  settingsKeys,
  structureKeys,
  structuresApi,
  taxSchemeKeys,
  taxSchemesApi,
} from '../api/payroll.api'

export const { useList: usePayrollSettings, useCreate: useCreatePayrollSettings, useUpdate: useUpdatePayrollSettings } = createResourceHooks(settingsApi, settingsKeys)
export const { useList: useComponents, useCreate: useCreateComponent, useUpdate: useUpdateComponent, useRemove: useRemoveComponent } = createResourceHooks(componentsApi, componentKeys, { alsoInvalidate: [structureKeys.all] })
export const { useList: useStructures, useCreate: useCreateStructure, useUpdate: useUpdateStructure, useRemove: useRemoveStructure } = createResourceHooks(structuresApi, structureKeys)
export const { useList: useSalaries, useCreate: useCreateSalary, useUpdate: useUpdateSalary, useRemove: useRemoveSalary } = createResourceHooks(salariesApi, salaryKeys)
export const { useList: useTaxSchemes, useCreate: useCreateTaxScheme, useUpdate: useUpdateTaxScheme, useRemove: useRemoveTaxScheme } = createResourceHooks(taxSchemesApi, taxSchemeKeys)
export const { useList: useAdjustments, useCreate: useCreateAdjustment, useRemove: useRemoveAdjustment } = createResourceHooks(adjustmentsApi, adjustmentKeys)

export function useComponentOptions() {
  const q = useComponents({ ...PICKER_PARAMS, is_active: true })
  return q.data?.results ?? []
}

export function useStructureOptions() {
  const q = useStructures({ ...PICKER_PARAMS, is_active: true })
  return { structures: q.data?.results ?? [], options: (q.data?.results ?? []).map((s) => ({ value: String(s.id), label: s.name })) }
}

// A run's state shows in its payslips, and adjustments get attached when it's computed.
const RUN = [runKeys.all, payslipKeys.all, adjustmentKeys.all]
function useRunAction<V, R>(fn: (v: V) => Promise<R>, form = false) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    meta: form ? { form: true } : { silent: true },
    onSuccess: () => {
      for (const key of RUN) void qc.invalidateQueries({ queryKey: key })
    },
  })
}

export function useRuns(params: ListParams) {
  return useQuery({ queryKey: runKeys.list(params), queryFn: () => runsApi.list(params), placeholderData: keepPreviousData })
}
export function useRun(id: Id | null) {
  return useQuery({ queryKey: runKeys.detail(id ?? 0), queryFn: () => runsApi.get(id!), enabled: id != null })
}
export function useBankSheet(id: Id | null) {
  return useQuery({ queryKey: [...runKeys.detail(id ?? 0), 'bank-sheet'], queryFn: () => runsApi.bankSheet(id!), enabled: id != null })
}
export const useCreateRun = () => useRunAction(runsApi.create, true)
export const useComputeRun = () => useRunAction(runsApi.compute)
export const useApproveRun = () => useRunAction(runsApi.approve)
export const useMarkPaid = () => useRunAction(({ id, ...input }: { id: Id; reference?: string }) => runsApi.markPaid(id, input), true)
export const useCancelRun = () => useRunAction(({ id, reason }: { id: Id; reason: string }) => runsApi.cancel(id, reason), true)

export function usePayslips(params: ListParams, enabled = true) {
  return useQuery({ queryKey: payslipKeys.list(params), queryFn: () => payslipsApi.list(params), placeholderData: keepPreviousData, enabled })
}
export function usePayslip(id: Id | null) {
  return useQuery({ queryKey: payslipKeys.detail(id ?? 0), queryFn: () => payslipsApi.get(id!), enabled: id != null })
}
export function useSetOvertime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, minutes }: { id: Id; minutes: number | null }) => payslipsApi.setOvertime(id, minutes),
    meta: { form: true },
    onSuccess: (slip) => {
      qc.setQueryData(payslipKeys.detail(slip.id), slip)
      void qc.invalidateQueries({ queryKey: payslipKeys.lists() })
      void qc.invalidateQueries({ queryKey: runKeys.all })
    },
  })
}
