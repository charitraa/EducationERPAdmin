import { apiClient } from '@/shared/api/client'
import { ApiError, toApiError } from '@/shared/api/errors'

/** `attachment; filename="x.pdf"` → `x.pdf` (RFC 5987 form first). */
function filenameFrom(disposition: string | undefined, fallback: string) {
  if (!disposition) return fallback
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(disposition)
  if (star?.[1]) return decodeURIComponent(star[1].replace(/"/g, ''))
  const plain = /filename="?([^";]+)"?/i.exec(disposition)
  return plain?.[1] ?? fallback
}

/**
 * Protected files need the Authorization header, so a plain `<a href>` can't
 * fetch them. Fetch as a blob through the API client (which refreshes the
 * token if needed), then hand it to the browser to save.
 */
export async function downloadFile(path: string, fallbackName = 'download', params?: Record<string, unknown>) {
  try {
    const res = await apiClient.get<Blob>(path, { params, responseType: 'blob' })
    const name = filenameFrom(res.headers['content-disposition'] as string | undefined, fallbackName)
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    // Error bodies come back as a Blob too: parse the JSON envelope out of it.
    const e = toApiError(err)
    const blob = (err as { response?: { data?: unknown } })?.response?.data
    if (blob instanceof Blob) {
      try {
        const body = JSON.parse(await blob.text())
        if (body?.error) throw new ApiError(body.error, e.status)
      } catch (parsed) {
        if (parsed instanceof ApiError) throw parsed
      }
    }
    throw e
  }
}
