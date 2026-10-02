import { compact } from '@/lib/utils'
import { apiClient } from '@/shared/api/client'
import type { Id, ListParams, Paginated, Schema } from '@/shared/types/api'

export type Notification = Schema<'Notification'>

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params: ListParams) => ['notifications', 'list', compact(params)] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
}

export const notificationsApi = {
  list: (params: ListParams = {}) =>
    apiClient.get<Paginated<Notification>>('/notifications/', { params: compact(params) }).then((r) => r.data),
  unreadCount: () => apiClient.get<{ unread: number }>('/notifications/unread-count/').then((r) => r.data.unread),
  markRead: (id: Id) => apiClient.post(`/notifications/${id}/mark-read/`).then(() => undefined),
  markAllRead: () => apiClient.post<{ marked: number }>('/notifications/mark-all-read/').then((r) => r.data),
}
