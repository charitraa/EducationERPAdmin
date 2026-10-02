import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import type { Id } from '@/shared/types/api'
import { notificationKeys, notificationsApi } from '../api/notifications.api'

export function useUnreadCount() {
  const { user } = useAuth()
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    enabled: Boolean(user),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

export function useNotificationList(isRead: boolean, enabled = true) {
  const params = { is_read: isRead, page_size: 20, ordering: '-created_at' }
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => notificationsApi.list(params),
    enabled,
  })
}

function useInvalidateNotifications() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: notificationKeys.all })
}

export function useMarkRead() {
  const onSuccess = useInvalidateNotifications()
  return useMutation({ mutationFn: (id: Id) => notificationsApi.markRead(id), onSuccess })
}

export function useMarkAllRead() {
  const onSuccess = useInvalidateNotifications()
  return useMutation({ mutationFn: notificationsApi.markAllRead, onSuccess })
}
