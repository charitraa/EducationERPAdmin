import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

export type Department = Schema<'Department'>
export type DepartmentInput = Schema<'DepartmentRequest'>

export const departmentsApi = createResourceApi<Department, DepartmentInput>('/departments/')
export const departmentKeys = createQueryKeys('departments')
