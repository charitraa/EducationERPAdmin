import { useQuery } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import type { Id } from '@/shared/types/api'
import { classesApi, classKeys, sectionStudents } from '../api/classes.api'

export const {
  useList: useClasses,
  useCreate: useCreateClass,
  useUpdate: useUpdateClass,
  useRemove: useRemoveClass,
} = createResourceHooks(classesApi, classKeys)

/** Who is in a class today, by name (not paginated). */
export function useSectionStudents(section: Id | null) {
  return useQuery({
    queryKey: [...classKeys.detail(section ?? 0), 'students'],
    queryFn: () => sectionStudents(section!),
    enabled: section != null,
  })
}
