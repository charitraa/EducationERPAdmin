import { createResourceHooks } from '@/shared/api/hooks'
import { calendarApi, calendarKeys } from '../api/calendar.api'

export const {
  useList: useCalendarEvents,
  useCreate: useCreateCalendarEvent,
  useUpdate: useUpdateCalendarEvent,
  useRemove: useRemoveCalendarEvent,
} = createResourceHooks(calendarApi, calendarKeys)
