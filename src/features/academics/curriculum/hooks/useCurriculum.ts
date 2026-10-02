import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id } from '@/shared/types/api'
import { curriculumApi, curriculumKeys } from '../api/curriculum.api'

export const { useUpdate: useUpdateCurriculumEntry, useRemove: useRemoveCurriculumEntry } = createResourceHooks(curriculumApi, curriculumKeys)

/** A program's whole curriculum in one page (the backend caps a page at 200). */
export function useProgramCurriculum(program: Id | null) {
  const params = { ...PICKER_PARAMS, program: program ?? undefined, ordering: 'level' }
  return useQuery({
    queryKey: curriculumKeys.list(params),
    queryFn: () => curriculumApi.list(params),
    enabled: program != null,
    placeholderData: keepPreviousData,
  })
}

/** Add several subjects to one level. Sequential so a failure says which subject. */
export function useAddCurriculumSubjects() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ program, level, subjects, isElective }: { program: Id; level: number; subjects: Id[]; isElective: boolean }) => {
      for (const subject of subjects) {
        await curriculumApi.create({ program, level, subject, is_elective: isElective })
      }
    },
    meta: { silent: true },
    onSettled: () => void qc.invalidateQueries({ queryKey: curriculumKeys.all }),
  })
}
