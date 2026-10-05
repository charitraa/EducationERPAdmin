import { z } from 'zod'
import { isoDate, optionalId, toNullableInt } from '@/lib/validation'
import type { CalendarEvent, CalendarEventInput } from '../api/calendar.api'
import { tr } from '@/lib/i18n'

export const calendarEventSchema = z
  .object({
    kind: z.enum(['holiday', 'closure', 'exam', 'event', 'makeup_day']),
    title: z.string().trim().min(1, tr('Required.')).max(200),
    description: z.string(),
    start_date: isoDate,
    end_date: isoDate,
    campus: optionalId,
    program: optionalId,
    level: optionalId,
    /** 'default' leaves it to the backend: yes for holidays, closures and exams. */
    suspends_classes: z.enum(['default', 'yes', 'no']),
    runs_timetable_of: optionalId,
  })
  .refine((v) => v.end_date >= v.start_date, { path: ['end_date'], message: tr("Can't end before it starts.") })
  .refine((v) => v.kind !== 'makeup_day' || v.runs_timetable_of !== '', { path: ['runs_timetable_of'], message: tr("Choose which weekday's timetable runs.") })

export type CalendarEventForm = z.infer<typeof calendarEventSchema>

export const calendarEventDefaults = (r: CalendarEvent | null): CalendarEventForm => ({
  kind: (r?.kind as CalendarEventForm['kind']) ?? 'holiday',
  title: r?.title ?? '',
  description: r?.description ?? '',
  start_date: r?.start_date ?? '',
  end_date: r?.end_date ?? '',
  campus: r?.campus ? String(r.campus) : '',
  program: r?.program ? String(r.program) : '',
  level: r?.level != null ? String(r.level) : '',
  suspends_classes: r ? (r.suspends_classes ? 'yes' : 'no') : 'default',
  runs_timetable_of: r?.runs_timetable_of != null ? String(r.runs_timetable_of) : '',
})

export function toCalendarEventInput(v: CalendarEventForm): CalendarEventInput {
  const input: CalendarEventInput = {
    kind: v.kind,
    title: v.title,
    description: v.description,
    start_date: v.start_date,
    end_date: v.end_date,
    campus: toNullableInt(v.campus),
    program: toNullableInt(v.program),
    level: v.program ? toNullableInt(v.level) : null,
    runs_timetable_of: v.kind === 'makeup_day' ? toNullableInt(v.runs_timetable_of) : null,
  }
  if (v.suspends_classes !== 'default') input.suspends_classes = v.suspends_classes === 'yes'
  return input
}
