import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Campus, CampusInput } from '@/shared/types/organization'

/** Branches are `campuses` in the API. */
export const branchesApi = createResourceApi<Campus, CampusInput>('/campuses/')
export const branchKeys = createQueryKeys('campuses')
