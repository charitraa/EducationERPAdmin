import { useQuery } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id } from '@/shared/types/api'
import { roomKeys, roomsApi } from '../api/rooms.api'

export const {
  useList: useRooms,
  useCreate: useCreateRoom,
  useUpdate: useUpdateRoom,
  useRemove: useRemoveRoom,
} = createResourceHooks(roomsApi, roomKeys)

export function useRoomOptions(campus: Id | null | undefined) {
  const params = { ...PICKER_PARAMS, is_active: true, ordering: 'code', campus: campus ?? undefined }
  return useQuery({
    queryKey: roomKeys.list(params),
    queryFn: () => roomsApi.list(params),
    select: (page) => page.results.map((r) => ({ value: String(r.id), label: `${r.code} · ${r.name}` })),
    staleTime: 5 * 60_000,
  })
}
