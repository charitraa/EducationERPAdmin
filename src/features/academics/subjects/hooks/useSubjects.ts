import { useQuery } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import { subjectKeys, subjectsApi } from '../api/subjects.api'

export const {
  useList: useSubjects,
  useCreate: useCreateSubject,
  useUpdate: useUpdateSubject,
  useRemove: useRemoveSubject,
} = createResourceHooks(subjectsApi, subjectKeys, { alsoInvalidate: [['curriculum']] })

export function useSubjectOptions(enabled = true) {
  const params = { ...PICKER_PARAMS, ordering: 'name' }
  return useQuery({
    queryKey: subjectKeys.list(params),
    queryFn: () => subjectsApi.list(params),
    select: (page) => page.results,
    enabled,
    staleTime: 5 * 60_000,
  })
}
