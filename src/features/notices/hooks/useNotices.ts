import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import type { Id } from '@/shared/types/api'
import { noticeKeys, noticesApi } from '../api/notices.api'

export const {
  useList: useNotices,
  useOne: useNotice,
  useCreate: useCreateNotice,
  useUpdate: useUpdateNotice,
  useRemove: useRemoveNotice,
} = createResourceHooks(noticesApi, noticeKeys)

export function usePublishNotice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, expiresAt }: { id: Id; expiresAt: string | null }) => noticesApi.publish(id, expiresAt),
    meta: { silent: true },
    onSuccess: (notice) => {
      qc.setQueryData(noticeKeys.detail(notice.id), notice)
      void qc.invalidateQueries({ queryKey: noticeKeys.all })
    },
  })
}
