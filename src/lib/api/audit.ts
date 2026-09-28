import { api } from './client'
import type { ListParams, PaginatedEnvelope } from './types'

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'password_change'
  | 'permission_change'
  | 'export'

export interface AuditLog {
  id: number
  actor: number | null
  actor_email: string
  actor_name: string | null
  organization: number | null
  action: AuditAction
  module: string
  object_type: string
  object_id: string
  object_repr: string
  changes: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string
  request_path: string
  request_method: string
  created_at: string
}

export interface AuditLogListParams extends ListParams {
  action?: AuditAction
  actor?: number
  actor_email?: string
  created_after?: string
  created_before?: string
  module?: string
  object_id?: string
  object_type?: string
}

export const auditApi = {
  list: (params?: AuditLogListParams) =>
    api.get<PaginatedEnvelope<AuditLog>>('/audit-logs/', { params }).then((r) => r.data),
  get: (id: number) => api.get<AuditLog>(`/audit-logs/${id}/`).then((r) => r.data),
}
