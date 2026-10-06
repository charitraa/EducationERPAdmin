import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id } from '@/shared/types/api'
import { electiveKeys, electivesApi, type StudentElective, type StudentElectiveInput } from '../api/electives.api'

/** Every elective choice recorded in a class, dropped ones included (they carry `ended_on`). */
export function useClassElectives(section: Id | null) {
  const params = { ...PICKER_PARAMS, section: section ?? undefined }
  return useQuery({
    queryKey: electiveKeys.list(params),
    queryFn: () => electivesApi.list(params),
    enabled: section != null,
  })
}

/** A student's choices across all their classes, newest class first. */
export function useStudentElectives(student: Id | null) {
  const params = { ...PICKER_PARAMS, student: student ?? undefined, ordering: '-created_at' }
  return useQuery({
    queryKey: electiveKeys.list(params),
    queryFn: () => electivesApi.list(params),
    enabled: student != null,
  })
}

/** Errors are shown in place (which cell failed), so they're kept out of the global toast. */
export function useAddElective() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: StudentElectiveInput) => electivesApi.create(input),
    meta: { silent: true },
    onSettled: () => void qc.invalidateQueries({ queryKey: electiveKeys.all }),
  })
}

/** Ends the choice today; one made today (or not started yet) is removed outright. */
export function useDropElective() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (choice: StudentElective) => electivesApi.remove(choice.id),
    meta: { silent: true },
    onSettled: () => void qc.invalidateQueries({ queryKey: electiveKeys.all }),
  })
}
