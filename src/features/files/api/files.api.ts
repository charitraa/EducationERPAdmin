import type { AxiosProgressEvent } from 'axios'
import { apiClient } from '@/shared/api/client'
import type { Id, Schema } from '@/shared/types/api'

export type StoredFile = Schema<'StoredFile'>

export const filesApi = {
  /** `purpose` must be one the backend registered (e.g. `resume`). */
  upload: (file: File, purpose: string, onProgress?: (percent: number) => void) => {
    const body = new FormData()
    body.append('file', file)
    body.append('purpose', purpose)
    return apiClient
      .post<StoredFile>('/files/', body, {
        onUploadProgress: (e: AxiosProgressEvent) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      })
      .then((r) => r.data)
  },
  /** Only works while nothing uses the file yet. */
  remove: (id: Id) => apiClient.delete(`/files/${id}/`).then(() => undefined),
  downloadPath: (id: Id) => `/files/${id}/download/`,
}
