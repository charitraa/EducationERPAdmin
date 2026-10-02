import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ComponentProps } from 'react'
import { DayPicker } from 'react-day-picker'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CalendarProps = ComponentProps<typeof DayPicker>

/** react-day-picker v9 styled with the app's tokens. */
export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-4 sm:flex-row',
        month: 'space-y-3',
        month_caption: 'flex h-8 items-center justify-center',
        caption_label: 'text-sm font-medium',
        dropdowns: 'flex gap-1.5 text-sm font-medium',
        dropdown_root: 'relative rounded-md border border-input px-1.5 py-0.5',
        dropdown: 'absolute inset-0 opacity-0',
        nav: 'absolute inset-x-0 top-0 flex h-8 items-center justify-between',
        button_previous: cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 p-0 opacity-70 hover:opacity-100'),
        button_next: cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 p-0 opacity-70 hover:opacity-100'),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 text-[0.75rem] font-normal text-muted-foreground',
        week: 'mt-1 flex w-full',
        day: 'h-9 w-9 p-0 text-center text-sm',
        day_button: cn(buttonVariants({ variant: 'ghost' }), 'h-9 w-9 p-0 font-normal tabular-nums'),
        selected: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary',
        today: '[&>button]:font-semibold [&>button]:underline [&>button]:underline-offset-4',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
