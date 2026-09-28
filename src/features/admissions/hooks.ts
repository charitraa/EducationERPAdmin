import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  admissionsApi,
  type Admission,
  type AdmissionListParams,
  type AdmissionPayload,
} from '@/lib/api/admissions'
import { createResourceHooks } from '@/lib/query/useResource'

export const {
  keys: admissionKeys,
  useList: useAdmissions,
  useDetail: useAdmission,
  useCreate: useCreateAdmission,
  useUpdate: useUpdateAdmission,
} = createResourceHooks<Admission, AdmissionPayload, AdmissionPayload, AdmissionListParams>('admissions', admissionsApi)

function useAdmissionAction<TArgs>(mutationFn: (id: number, args: TArgs) => Promise<Admission>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, args }: { id: number; args: TArgs }) => mutationFn(id, args),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: admissionKeys.lists() })
      qc.invalidateQueries({ queryKey: admissionKeys.detail(vars.id) })
    },
  })
}

export function useApproveAdmission() {
  return useAdmissionAction<string | undefined>((id, note) => admissionsApi.approve(id, note))
}

export function useRejectAdmission() {
  return useAdmissionAction<string>((id, note) => admissionsApi.reject(id, note))
}

export function useWithdrawAdmission() {
  return useAdmissionAction<string | undefined>((id, note) => admissionsApi.withdraw(id, note))
}

export function useEnrollAdmission() {
  return useAdmissionAction<{ student_number: string; started_on?: string }>((id, payload) => admissionsApi.enroll(id, payload))
}
