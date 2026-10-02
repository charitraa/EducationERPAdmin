import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { classKeys } from '@/features/academics/classes/api/classes.api'
import { createResourceHooks } from '@/shared/api/hooks'
import type { Id } from '@/shared/types/api'
import { studentKeys, studentsApi, type PlacementInput, type StatusChangeInput, type Student, type TransferInput } from '../api/students.api'

export const {
  useList: useStudents,
  useOne: useStudent,
  useCreate: useCreateStudent,
  useUpdate: useUpdateStudent,
  useRemove: useRemoveStudent,
} = createResourceHooks(studentsApi, studentKeys, { alsoInvalidate: [classKeys.all] })

export function useStudentEnrollments(id: Id | null | undefined) {
  return useQuery({
    queryKey: [...studentKeys.detail(id ?? 0), 'enrollments'],
    queryFn: () => studentsApi.enrollments(id!),
    enabled: id != null,
  })
}

/**
 * Status changes, placements and transfers all return the updated student and
 * change class head-counts, so they share one cache update.
 */
function useStudentAction<TInput>(run: (id: Id, input: TInput) => Promise<Student>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: Id; input: TInput }) => run(id, input),
    meta: { form: true },
    onSuccess: (student) => {
      qc.setQueryData(studentKeys.detail(student.id), student)
      void qc.invalidateQueries({ queryKey: studentKeys.all })
      void qc.invalidateQueries({ queryKey: classKeys.all })
    },
  })
}

export const useChangeStudentStatus = () => useStudentAction<StatusChangeInput>(studentsApi.changeStatus)
export const usePlaceStudent = () => useStudentAction<PlacementInput>(studentsApi.place)
export const useTransferStudent = () => useStudentAction<TransferInput>(studentsApi.transfer)
