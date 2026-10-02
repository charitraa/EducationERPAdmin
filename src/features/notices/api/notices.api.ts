import { apiClient } from '@/shared/api/client'
import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Id, Schema } from '@/shared/types/api'

export type Notice = Schema<'Notice'>
export type NoticeInput = Schema<'NoticeRequest'>

/** Draft → published; a published notice stops showing once it expires. */
export type NoticeState = 'draft' | 'published' | 'expired'
export const noticeState = (n: Pick<Notice, 'is_published' | 'is_expired'>): NoticeState => (!n.is_published ? 'draft' : n.is_expired ? 'expired' : 'published')

const base = createResourceApi<Notice, NoticeInput>('/notices/')

export const noticesApi = {
  ...base,
  publish: (id: Id, expiresAt: string | null) => apiClient.post<Notice>(`${base.url(id)}publish/`, expiresAt ? { expires_at: expiresAt } : {}).then((r) => r.data),
}

export const noticeKeys = createQueryKeys('notices')

/** A picked AD date → the end of that day in the viewer's time zone, as the API's datetime. */
export function endOfDayIso(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y!, m! - 1, d!, 23, 59, 59).toISOString()
}

/** The API's datetime → the AD date it falls on locally, for the date field. */
export function localDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
