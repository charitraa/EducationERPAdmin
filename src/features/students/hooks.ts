import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  studentsApi,
  type EnrollmentRef,
  type Student,
  type StudentListParams,
  type StudentPayload,
  type StudentStatus,
} from '@/lib/api/students'
import { createResourceHooks } from '@/lib/query/useResource'

export const {
  keys: studentKeys,
  useList: useStudents,
  useDetail: useStudent,
  useCreate: useCreateStudent,
  useUpdate: useUpdateStudent,
} = createResourceHooks<Student, StudentPayload, StudentPayload, StudentListParams>('students', studentsApi)

export function useStudentEnrollments(id: number | null) {
  return useQuery<EnrollmentRef[]>({
    queryKey: [...studentKeys.detail(id as number), 'enrollments'],
    queryFn: () => studentsApi.enrollments(id as number),
    enabled: id !== null,
  })
}

export function useChangeStudentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { status: StudentStatus; on_date?: string; reason?: string } }) =>
      studentsApi.changeStatus(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: studentKeys.lists() })
      qc.invalidateQueries({ queryKey: studentKeys.detail(vars.id) })
    },
  })
}

export function useTransferStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { campus: number; on_date?: string; reason?: string } }) =>
      studentsApi.transfer(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: studentKeys.lists() })
      qc.invalidateQueries({ queryKey: studentKeys.detail(vars.id) })
    },
  })
}
