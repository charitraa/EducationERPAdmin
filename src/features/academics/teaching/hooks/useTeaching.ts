import { useQuery } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id } from '@/shared/types/api'
import { teachingApi, teachingKeys } from '../api/teaching.api'

export const {
  useList: useTeachingAssignments,
  useCreate: useCreateTeachingAssignment,
  useUpdate: useUpdateTeachingAssignment,
  useRemove: useRemoveTeachingAssignment,
} = createResourceHooks(teachingApi, teachingKeys, { alsoInvalidate: [['timetable']] })

/** A class's active assignments, for timetable pickers. */
export function useClassAssignments(section: Id | null) {
  const params = { ...PICKER_PARAMS, section: section ?? undefined }
  return useQuery({
    queryKey: teachingKeys.list(params),
    queryFn: () => teachingApi.list(params),
    select: (p) => p.results.filter((a) => a.is_active !== false),
    enabled: section != null,
  })
}
