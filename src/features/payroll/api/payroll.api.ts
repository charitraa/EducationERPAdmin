import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type PayrollSettings = Schema<'PayrollSettings'>
export type PayrollSettingsInput = Schema<'PayrollSettingsRequest'>
export type PayComponent = Schema<'PayComponent'>
export type PayComponentInput = Schema<'PayComponentRequest'>
export type SalaryStructure = Schema<'SalaryStructure'>
export type SalaryStructureInput = Schema<'SalaryStructureRequest'>
export type StaffSalary = Schema<'StaffSalary'>
export type StaffSalaryInput = Schema<'StaffSalaryRequest'>
export type TaxScheme = Schema<'TaxScheme'>
export type TaxSchemeInput = Schema<'TaxSchemeRequest'>
export type PayslipRow = Schema<'PayslipList'>
export type PayslipLine = Schema<'PayslipLine'>
export type PayrollAdjustment = Schema<'PayrollAdjustment'>
export type PayrollAdjustmentInput = Schema<'PayrollAdjustmentRequest'>
export type RunStatus = Schema<'PayrollRunStatusEnum'>

/** `totals` is typed as a bare dict in the OpenAPI; this is what the serializer returns. */
export interface RunTotals {
  payslips: number
  gross_pay: string
  tax: string
  total_deductions: string
  net_pay: string
}
export type PayrollRun = Omit<Schema<'PayrollRun'>, 'totals'> & { totals: RunTotals }

/** The working-out kept with a payslip: each day that wasn't a plain working day, and warnings. */
export interface PayslipDetails {
  days?: Array<{ date: string; leave?: string; days?: string; paid?: boolean; attendance?: string }>
  warnings?: string[]
}
export type Payslip = Omit<Schema<'Payslip'>, 'details'> & { details: PayslipDetails }

export interface ComputeResult {
  payslips: number
  skipped: Array<{ staff: Id; staff_name: string; reason: 'already_paid' | 'no_salary'; detail: string }>
  run: PayrollRun
}

export interface BankSheet {
  run: Id
  status: RunStatus
  rows: Array<{ payslip: string; staff: Id; staff_name: string; employee_number: string; bank_name: string; bank_branch: string; account_name: string; account_number: string; net_pay: string }>
  without_bank_account: string[]
}

const post = <T>(url: string, body?: unknown) => apiClient.post<T>(url, body).then((r) => r.data)

export const settingsApi = createResourceApi<PayrollSettings, PayrollSettingsInput>('/payroll/settings/')
export const settingsKeys = createQueryKeys('payroll-settings')
export const componentsApi = createResourceApi<PayComponent, PayComponentInput>('/payroll/components/')
export const componentKeys = createQueryKeys('payroll-components')
export const structuresApi = createResourceApi<SalaryStructure, SalaryStructureInput>('/payroll/structures/')
export const structureKeys = createQueryKeys('payroll-structures')
export const salariesApi = createResourceApi<StaffSalary, StaffSalaryInput>('/payroll/staff-salaries/')
export const salaryKeys = createQueryKeys('payroll-salaries')
export const taxSchemesApi = createResourceApi<TaxScheme, TaxSchemeInput>('/payroll/tax-schemes/')
export const taxSchemeKeys = createQueryKeys('payroll-tax-schemes')
export const adjustmentsApi = createResourceApi<PayrollAdjustment, PayrollAdjustmentInput>('/payroll/adjustments/')
export const adjustmentKeys = createQueryKeys('payroll-adjustments')

const runs = createResourceApi<PayrollRun>('/payroll/runs/')
export const runsApi = {
  list: runs.list,
  get: runs.get,
  /** The fiscal year (for tax) is picked from the period. */
  create: (input: { campus: Id; name: string; period_start: string; period_end: string; notes?: string }) => post<PayrollRun>('/payroll/runs/', input),
  compute: (id: Id) => post<ComputeResult>(`/payroll/runs/${id}/compute/`),
  approve: (id: Id) => post<PayrollRun>(`/payroll/runs/${id}/approve/`),
  markPaid: (id: Id, input: { reference?: string }) => post<PayrollRun>(`/payroll/runs/${id}/mark-paid/`, input),
  cancel: (id: Id, reason: string) => post<PayrollRun>(`/payroll/runs/${id}/cancel/`, { reason }),
  bankSheet: (id: Id) => apiClient.get<BankSheet>(`/payroll/runs/${id}/bank-sheet/`).then((r) => r.data),
}
export const runKeys = createQueryKeys('payroll-runs')

const payslips = createResourceApi<Payslip>('/payroll/payslips/')
export const payslipsApi = {
  list: createResourceApi<PayslipRow>('/payroll/payslips/').list,
  get: payslips.get,
  /** `null` goes back to the count from attendance. Draft runs only. */
  setOvertime: (id: Id, minutes: number | null) => post<Payslip>(`/payroll/payslips/${id}/set-overtime/`, { minutes }),
  mine: () => apiClient.get<Payslip[]>('/payroll/payslips/me/').then((r) => r.data),
}
export const payslipKeys = createQueryKeys('payroll-payslips')
