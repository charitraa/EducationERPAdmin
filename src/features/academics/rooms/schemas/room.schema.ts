import { z } from 'zod'
import { code, optionalWholeNumber, requiredId, toInt, toNullableInt } from '@/lib/validation'
import type { Room, RoomInput } from '../api/rooms.api'
import { tr } from '@/lib/i18n'

export const roomSchema = z.object({
  campus: requiredId(tr('Choose the branch.')),
  code,
  name: z.string().trim().min(1, tr('Required.')).max(100),
  building: z.string().max(100),
  floor: z.string().max(20),
  room_type: z.enum(['classroom', 'lab', 'hall', 'library', 'office', 'other']),
  capacity: optionalWholeNumber,
  is_active: z.boolean(),
})

export type RoomForm = z.infer<typeof roomSchema>

export const roomDefaults = (r: Room | null, defaultCampus: number | null): RoomForm => ({
  campus: r ? String(r.campus) : defaultCampus ? String(defaultCampus) : '',
  code: r?.code ?? '',
  name: r?.name ?? '',
  building: r?.building ?? '',
  floor: r?.floor ?? '',
  room_type: (r?.room_type as RoomForm['room_type']) ?? 'classroom',
  capacity: r?.capacity != null ? String(r.capacity) : '',
  is_active: r?.is_active ?? true,
})

export const toRoomInput = (v: RoomForm): RoomInput => ({ ...v, campus: toInt(v.campus), capacity: toNullableInt(v.capacity) })
