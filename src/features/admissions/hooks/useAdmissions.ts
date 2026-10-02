import { useMutation, useQueryClient } from '@tanstack/react-query'
import { studentKeys } from '@/features/students/api/students.api'
import { createResourceHooks } from '@/shared/api/hooks'
import { useCount } from '@/shared/api/count'
import type { Id } from '@/shared/types/api'
import { admissionKeys, admissionsApi, type Admission, type AdmissionDecision, type AdmissionStatus, type EnrollInput } from '../api/admissions.api'

export const {
  useList: useAdmissions,
  useOne: useAdmission,
  useCreate: useCreateAdmission,
  useUpdate: useUpdateAdmission,
  useRemove: useRemoveAdmission,
} = createResourceHooks(admissionsApi, admissionKeys)

/** Applications in one status (for the pipeline summary). Follows the header's branch. */
export function useAdmissionCount(status: AdmissionStatus, campus?: Id | null) {
  return useCount('admissions', '/admissions/', { status, campus: campus ?? undefined })
}

function useAdmissionAction<TVars>(run: (vars: TVars) => Promise<Admission>, alsoStudents = false) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: run,
    meta: { form: true },
    onSuccess: (admission) => {
      qc.setQueryData(admissionKeys.detail(admission.id), admission)
      void qc.invalidateQueries({ queryKey: admissionKeys.all })
      // Enrolling creates a student and a parent.
      if (alsoStudents) {
        void qc.invalidateQueries({ queryKey: studentKeys.all })
        void qc.invalidateQueries({ queryKey: ['parents'] })
      }
    },
  })
}

export const useDecideAdmission = () =>
  useAdmissionAction(({ id, decision, note }: { id: Id; decision: AdmissionDecision; note: string }) => admissionsApi.decide(id, decision, note))

export const useEnrollAdmission = () => useAdmissionAction(({ id, input }: { id: Id; input: EnrollInput }) => admissionsApi.enroll(id, input), true)
