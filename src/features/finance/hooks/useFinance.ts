import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id, ListParams } from '@/shared/types/api'
import {
  categoriesApi,
  categoryKeys,
  financeReportKeys,
  grantKeys,
  grantsApi,
  invoiceKeys,
  invoicesApi,
  paymentKeys,
  paymentsApi,
  receiptKeys,
  receiptsApi,
  refundKeys,
  refundsApi,
  reportsApi,
  scholarshipKeys,
  scholarshipsApi,
  structureKeys,
  structuresApi,
} from '../api/finance.api'

/** Money moving changes invoices, payments, receipts and every report. */
const MONEY = [invoiceKeys.all, paymentKeys.all, receiptKeys.all, refundKeys.all, financeReportKeys.all]

function useInvalidate(keys: QueryKey[]) {
  const qc = useQueryClient()
  return () => {
    for (const key of keys) void qc.invalidateQueries({ queryKey: key })
  }
}

function useMoneyMutation<V, R>(fn: (v: V) => Promise<R>, meta: { form?: boolean; silent?: boolean } = { silent: true }) {
  const invalidate = useInvalidate(MONEY)
  return useMutation({ mutationFn: fn, meta, onSuccess: invalidate })
}

export const { useList: useCategories, useCreate: useCreateCategory, useUpdate: useUpdateCategory, useRemove: useRemoveCategory } = createResourceHooks(categoriesApi, categoryKeys)

export function useCategoryOptions() {
  const params = { ...PICKER_PARAMS, is_active: true }
  return useQuery({ queryKey: categoryKeys.list(params), queryFn: () => categoriesApi.list(params), select: (p) => p.results, staleTime: 5 * 60_000 })
}

export const { useList: useStructures, useCreate: useCreateStructure, useUpdate: useUpdateStructure, useRemove: useRemoveStructure } = createResourceHooks(structuresApi, structureKeys)

export const useGenerateTermInvoices = () => useMoneyMutation(({ id, ...input }: { id: Id; term: Id; section?: Id; due_date?: string }) => structuresApi.generateTerm(id, input), { form: true })
export const useGenerateOneTimeInvoice = () => useMoneyMutation(({ id, ...input }: { id: Id; student: Id; due_date?: string }) => structuresApi.generateOneTime(id, input), { form: true })

export const { useList: useScholarships, useCreate: useCreateScholarship, useUpdate: useUpdateScholarship, useRemove: useRemoveScholarship } = createResourceHooks(scholarshipsApi, scholarshipKeys)

export function useScholarshipOptions() {
  const params = { ...PICKER_PARAMS, is_active: true }
  return useQuery({ queryKey: scholarshipKeys.list(params), queryFn: () => scholarshipsApi.list(params), select: (p) => p.results, staleTime: 5 * 60_000 })
}

export function useGrants(params: ListParams) {
  return useQuery({ queryKey: grantKeys.list(params), queryFn: () => grantsApi.list(params), placeholderData: keepPreviousData })
}

export function useGrantScholarship() {
  const invalidate = useInvalidate([grantKeys.all])
  return useMutation({ mutationFn: grantsApi.create, meta: { form: true }, onSuccess: invalidate })
}

export function useEndGrant() {
  const invalidate = useInvalidate([grantKeys.all])
  return useMutation({ mutationFn: ({ id, ended_on }: { id: Id; ended_on: string }) => grantsApi.end(id, ended_on), meta: { form: true }, onSuccess: invalidate })
}

export function useInvoices(params: ListParams, enabled = true) {
  return useQuery({ queryKey: invoiceKeys.list(params), queryFn: () => invoicesApi.list(params), placeholderData: keepPreviousData, enabled })
}

export function useInvoice(id: Id | null) {
  return useQuery({ queryKey: invoiceKeys.detail(id ?? 0), queryFn: () => invoicesApi.get(id!), enabled: id != null })
}

export const useAddInvoiceItem = () => useMoneyMutation(({ id, ...input }: { id: Id } & Parameters<typeof invoicesApi.addItem>[1]) => invoicesApi.addItem(id, input), { form: true })
export const useCancelInvoice = () => useMoneyMutation(({ id, reason }: { id: Id; reason: string }) => invoicesApi.cancel(id, reason), { form: true })
export const useSetInstallments = () => useMoneyMutation(({ id, installments }: { id: Id; installments: Array<{ amount: string; due_date: string }> }) => invoicesApi.setInstallments(id, installments), { form: true })
export const useAssessLateFees = () => useMoneyMutation(invoicesApi.assessLateFees, { form: true })

export function usePayments(params: ListParams, enabled = true) {
  return useQuery({ queryKey: paymentKeys.list(params), queryFn: () => paymentsApi.list(params), placeholderData: keepPreviousData, enabled })
}

export function usePayment(id: Id | null) {
  return useQuery({ queryKey: paymentKeys.detail(id ?? 0), queryFn: () => paymentsApi.get(id!), enabled: id != null })
}

export const useRecordPayment = () => useMoneyMutation(paymentsApi.record, { form: true })
export const useRefund = () => useMoneyMutation(({ id, ...input }: { id: Id; amount: string; reason: string }) => paymentsApi.refund(id, input), { form: true })

export function useReceipts(params: ListParams, enabled = true) {
  return useQuery({ queryKey: receiptKeys.list(params), queryFn: () => receiptsApi.list(params), enabled })
}

export function useRefunds(params: ListParams, enabled = true) {
  return useQuery({ queryKey: refundKeys.list(params), queryFn: () => refundsApi.list(params), placeholderData: keepPreviousData, enabled })
}

export function useStatement(params: { student: Id | null; from?: string; to?: string }) {
  return useQuery({ queryKey: [...financeReportKeys.all, 'statement', params], queryFn: () => reportsApi.statement({ ...params, student: params.student! }), enabled: params.student != null })
}

export function useOutstanding(params: { program?: Id; section?: Id } = {}) {
  return useQuery({ queryKey: [...financeReportKeys.all, 'outstanding', params], queryFn: () => reportsApi.outstanding(params) })
}

export function useCollection(params: { from?: string; to?: string }, enabled = true) {
  return useQuery({ queryKey: [...financeReportKeys.all, 'collection', params], queryFn: () => reportsApi.collection(params), enabled })
}
