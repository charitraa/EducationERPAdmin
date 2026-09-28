import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { auditApi, type AuditLogListParams } from '@/lib/api/audit'

export function useAuditLogs(params?: AuditLogListParams) {
  return useQuery({
    queryKey: ['audit-logs', 'list', params],
    queryFn: () => auditApi.list(params),
    placeholderData: keepPreviousData,
  })
}
