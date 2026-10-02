import { apiClient } from '@/shared/api/client'
import type { MissingAttendance, MyMarkSheet, MyRollCalls, OutstandingReport } from '../types/dashboard.types'

export const dashboardKeys = {
  outstanding: ['invoices', 'reports', 'outstanding'] as const,
  missingAttendance: ['attendance', 'reports', 'missing'] as const,
  myMarkSheets: ['mark-sheets', 'mine'] as const,
  myRollCalls: ['attendance', 'sessions', 'mine'] as const,
}

export const dashboardApi = {
  outstanding: () => apiClient.get<OutstandingReport>('/invoices/reports/outstanding/').then((r) => r.data),
  missingAttendance: () => apiClient.get<MissingAttendance>('/attendance/reports/missing/').then((r) => r.data),
  myMarkSheets: () => apiClient.get<MyMarkSheet[]>('/mark-sheets/mine/').then((r) => r.data),
  myRollCalls: () => apiClient.get<MyRollCalls>('/attendance/sessions/mine/').then((r) => r.data),
}
