import { campusesApi, type Campus, type CampusPayload } from '@/lib/api/campuses'
import { createResourceHooks } from '@/lib/query/useResource'
import type { ListParams } from '@/lib/api/types'

export interface CampusListParams extends ListParams {
  city?: string
  is_active?: boolean
  is_main?: boolean
}

export const {
  useList: useCampuses,
  useDetail: useCampus,
  useCreate: useCreateCampus,
  useUpdate: useUpdateCampus,
} = createResourceHooks<Campus, CampusPayload, CampusPayload, CampusListParams>('campuses', campusesApi)
