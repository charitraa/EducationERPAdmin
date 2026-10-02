import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'

export type CalendarEvent = Schema<'CalendarEvent'>
export type CalendarEventInput = Schema<'CalendarEventRequest'>

export const calendarApi = createResourceApi<CalendarEvent, CalendarEventInput>('/calendar/')
export const calendarKeys = createQueryKeys('calendar')

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
