import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { auditApi, type AuditLogListParams } from '@/lib/api/audit'
import { createQueryKeys } from '@/lib/query/keys'

export const auditKeys = createQueryKeys<AuditLogListParams>('audit-logs')

export function useAuditLogs(params?: AuditLogListParams) {
  return useQuery({
    queryKey: auditKeys.list(params),
    queryFn: () => auditApi.list(params),
    placeholderData: keepPreviousData,
  })
}
