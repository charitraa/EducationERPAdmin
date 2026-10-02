import { CalendarDays } from 'lucide-react'
import { forwardRef, useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { parseIsoDate, toBsDate, toIsoDate } from '@/lib/dates'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  /** AD `YYYY-MM-DD`, or '' when empty. This is what the API receives. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  id?: string
  disabled?: boolean
  className?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Type the date or pick it from a calendar. The BS equivalent is shown under
 * the field so staff who think in BS can check it; only AD is stored.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { value, onChange, onBlur, id, disabled, className, ...aria },
  ref,
) {
  const [open, setOpen] = useState(false)
  const selected = parseIsoDate(value)
  const bs = toBsDate(value)

  return (
    <div className={cn('grid gap-1', className)}>
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="YYYY-MM-DD"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          className="pr-10 tabular-nums"
          {...aria}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Open calendar"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              captionLayout="dropdown"
              startMonth={new Date(1950, 0)}
              endMonth={new Date(new Date().getFullYear() + 10, 11)}
              selected={selected ?? undefined}
              defaultMonth={selected ?? undefined}
              onSelect={(d) => {
                if (d) onChange(toIsoDate(d))
                setOpen(false)
              }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {bs && <p className="text-xs tabular-nums text-muted-foreground">{bs} BS</p>}
    </div>
  )
})
