import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createResourceHooks } from '@/shared/api/hooks'
import { PICKER_PARAMS } from '@/shared/api/pagination'
import type { Id } from '@/shared/types/api'
import { academicYearKeys, academicYearsApi } from '../api/academic-years.api'

export const {
  useList: useAcademicYears,
  useCreate: useCreateAcademicYear,
  useUpdate: useUpdateAcademicYear,
  useRemove: useRemoveAcademicYear,
} = createResourceHooks(academicYearsApi, academicYearKeys, { alsoInvalidate: [['terms'], ['sections']] })

/** All years for pickers, newest first. */
export function useAcademicYearOptions(enabled = true) {
  const params = { ...PICKER_PARAMS, ordering: '-start_date' }
  return useQuery({
    queryKey: academicYearKeys.list(params),
    queryFn: () => academicYearsApi.list(params),
    select: (page) => page.results,
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useCurrentAcademicYear(enabled = true) {
  const params = { is_current: true, page_size: 1 }
  return useQuery({
    queryKey: academicYearKeys.list(params),
    queryFn: () => academicYearsApi.list(params),
    select: (page) => page.results[0] ?? null,
    enabled,
    staleTime: 5 * 60_000,
  })
}

export function useSetCurrentAcademicYear() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: Id) => academicYearsApi.setCurrent(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: academicYearKeys.all }),
  })
}
