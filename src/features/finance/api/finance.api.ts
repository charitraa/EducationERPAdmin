import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

// Money is a decimal string from the API ("1500.00") and stays one: see lib/currency.

export type FeeCategory = Schema<'FeeCategory'>
export type FeeCategoryInput = Schema<'FeeCategoryRequest'>
export type FeeStructure = Schema<'FeeStructure'>
export type FeeStructureInput = Schema<'FeeStructureRequest'>
export type Scholarship = Schema<'Scholarship'>
export type ScholarshipInput = Schema<'ScholarshipRequest'>
export type StudentScholarship = Schema<'StudentScholarship'>
export type StudentScholarshipInput = Schema<'StudentScholarshipRequest'>
export type Invoice = Schema<'Invoice'>
export type InvoiceRow = Schema<'InvoiceList'>
export type InvoiceItem = Schema<'InvoiceItem'>
export type Payment = Schema<'Payment'>
export type PaymentMethod = Schema<'PaymentMethodEnum'>
export type Receipt = Schema<'Receipt'>
export type Refund = Schema<'Refund'>

// Report shapes are hand-written (typed `None` in the OpenAPI). Their amounts are JSON numbers.

export interface Statement {
  student: Id
  student_name: string
  student_number: string
  invoices: Array<{ invoice: Id; invoice_number: string; term: Id | null; term_name: string | null; issue_date: string; due_date: string; total: number; paid: number; balance: number; is_paid: boolean; is_overdue: boolean }>
  total_billed: number
  total_paid: number
  balance: number
}

export interface Outstanding {
  as_of: string
  count: number
  total_outstanding: number
  invoices: Array<{ invoice: Id; invoice_number: string; student: Id; student_name: string; student_number: string; section_name: string | null; due_date: string; days_overdue: number; total: number; balance: number }>
}

export interface Collection {
  from: string
  to: string
  total: number
  by_method: Partial<Record<PaymentMethod, number>>
  payments: Array<{ payment: Id; invoice: Id; invoice_number: string; student_name: string; amount: number; method: PaymentMethod; reference: string; paid_at: string }>
}

export const categoriesApi = createResourceApi<FeeCategory, FeeCategoryInput>('/fee-categories/')
export const categoryKeys = createQueryKeys('fee-categories')

const structuresBase = createResourceApi<FeeStructure, FeeStructureInput>('/fee-structures/')
export const structuresApi = {
  ...structuresBase,
  /** One invoice per student placed in a matching class; already-invoiced students are skipped. */
  generateTerm: (id: Id, input: { term: Id; section?: Id; due_date?: string }) =>
    apiClient.post<{ created: number; skipped: number }>(`${structuresBase.url(id)}generate-invoices/`, input).then((r) => r.data),
  generateOneTime: (id: Id, input: { student: Id; due_date?: string }) => apiClient.post<Invoice>(`${structuresBase.url(id)}generate-one-time-invoice/`, input).then((r) => r.data),
}
export const structureKeys = createQueryKeys('fee-structures')

export const scholarshipsApi = createResourceApi<Scholarship, ScholarshipInput>('/scholarships/')
export const scholarshipKeys = createQueryKeys('scholarships')

const grantsBase = createResourceApi<StudentScholarship, StudentScholarshipInput>('/student-scholarships/')
export const grantsApi = {
  list: grantsBase.list,
  create: grantsBase.create,
  end: (id: Id, ended_on: string) => apiClient.post<StudentScholarship>(`${grantsBase.url(id)}end/`, { ended_on }).then((r) => r.data),
}
export const grantKeys = createQueryKeys('student-scholarships')

const invoicesBase = createResourceApi<Invoice>('/invoices/')
export const invoicesApi = {
  list: createResourceApi<InvoiceRow>('/invoices/').list,
  get: invoicesBase.get,
  addItem: (id: Id, input: { kind: 'discount' | 'fine' | 'adjustment'; description: string; amount: string; category?: Id }) =>
    apiClient.post<InvoiceItem>(`${invoicesBase.url(id)}add-item/`, input).then((r) => r.data),
  cancel: (id: Id, reason: string) => apiClient.post<Invoice>(`${invoicesBase.url(id)}cancel/`, { reason }).then((r) => r.data),
  setInstallments: (id: Id, installments: Array<{ amount: string; due_date: string }>) => apiClient.post<Invoice>(`${invoicesBase.url(id)}installments/`, { installments }).then((r) => r.data),
  assessLateFees: (input: { campus?: Id; amount?: string; percentage?: string; grace_days: number; category?: Id }) =>
    apiClient.post<{ fined: number }>('/invoices/assess-late-fees/', input).then((r) => r.data),
}
export const invoiceKeys = createQueryKeys('invoices')

export const reportsApi = {
  statement: (params: { student: Id; from?: string; to?: string }) => apiClient.get<Statement>('/invoices/reports/student/', { params }).then((r) => r.data),
  outstanding: (params: { program?: Id; section?: Id } = {}) => apiClient.get<Outstanding>('/invoices/reports/outstanding/', { params }).then((r) => r.data),
  collection: (params: { from?: string; to?: string }) => apiClient.get<Collection>('/invoices/reports/collection/', { params }).then((r) => r.data),
}
export const financeReportKeys = createQueryKeys('finance-reports')

export const paymentsApi = {
  list: createResourceApi<Payment>('/payments/').list,
  get: (id: Id) => apiClient.get<Payment>(`/payments/${id}/`).then((r) => r.data),
  /** Issues a receipt too. `paid_at` defaults to now. */
  record: (input: { invoice: Id; amount: string; method: PaymentMethod; reference?: string; note?: string; paid_at?: string }) =>
    apiClient.post<Payment>('/payments/', input).then((r) => r.data),
  refund: (id: Id, input: { amount: string; reason: string }) => apiClient.post<Refund>(`/payments/${id}/refund/`, input).then((r) => r.data),
}
export const paymentKeys = createQueryKeys('payments')

export const receiptsApi = { list: createResourceApi<Receipt>('/receipts/').list }
export const receiptKeys = createQueryKeys('receipts')

export const refundsApi = { list: createResourceApi<Refund>('/refunds/').list }
export const refundKeys = createQueryKeys('refunds')
