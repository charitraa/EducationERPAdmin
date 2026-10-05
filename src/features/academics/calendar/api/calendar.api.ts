import { createQueryKeys, createResourceApi } from '@/shared/api/resource'
import type { Schema } from '@/shared/types/api'
import { tr } from '@/lib/i18n'

export type CalendarEvent = Schema<'CalendarEvent'>
export type CalendarEventInput = Schema<'CalendarEventRequest'>

export const calendarApi = createResourceApi<CalendarEvent, CalendarEventInput>('/calendar/')
export const calendarKeys = createQueryKeys('calendar')

export const WEEKDAYS = [tr('Monday'), tr('Tuesday'), tr('Wednesday'), tr('Thursday'), tr('Friday'), tr('Saturday'), tr('Sunday')]
