import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface FilterOption {
  value: string
  label: string
}

export interface FilterDef {
  name: string
  label: string
  options: FilterOption[]
  /** Hide the filter entirely (e.g. Branch when there is only one). */
  hidden?: boolean
}

interface FilterPanelProps {
  filters: FilterDef[]
  values: Record<string, string | undefined>
  onChange: (name: string, value: string | undefined) => void
  onClear: () => void
  activeCount: number
}

const ANY = '__any__'

function FilterSelect({ def, value, onChange }: { def: FilterDef; value?: string; onChange: (v?: string) => void }) {
  const id = `filter-${def.name}`
  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {def.label}
      </Label>
      <Select value={value ?? ANY} onValueChange={(v) => onChange(v === ANY ? undefined : v)}>
        <SelectTrigger id={id} className="h-8 w-full text-sm sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>All</SelectItem>
          {def.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Up to two filters sit inline on desktop; more (and all, on mobile) go in a popover. */
export function FilterPanel({ filters, values, onChange, onClear, activeCount }: FilterPanelProps) {
  const visible = filters.filter((f) => !f.hidden)
  if (visible.length === 0) return null
  const inline = visible.length <= 2

  return (
    <>
      {inline && (
        <div className="hidden items-end gap-2 md:flex">
          {visible.map((def) => (
            <FilterSelect key={def.name} def={def} value={values[def.name]} onChange={(v) => onChange(def.name, v)} />
          ))}
        </div>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={inline ? 'h-9 md:hidden' : 'h-9'}>
            <SlidersHorizontal aria-hidden />
            Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="grid gap-3">
            {visible.map((def) => (
              <FilterSelect key={def.name} def={def} value={values[def.name]} onChange={(v) => onChange(def.name, v)} />
            ))}
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear} className="justify-self-start">
                Clear filters
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
