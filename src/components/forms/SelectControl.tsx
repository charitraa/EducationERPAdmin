import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FieldControlProps } from './FormField'
import { tr } from '@/lib/i18n'

const NONE = '__none__'

export interface SelectOption {
  value: string
  label: string
}

interface SelectControlProps extends Partial<FieldControlProps> {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  /** Offer a "None" choice that maps to ''. */
  allowEmpty?: boolean
  emptyLabel?: string
  disabled?: boolean
  loading?: boolean
  /** For a select with no visible label, such as one cell in a row of inputs. */
  'aria-label'?: string
}

/** Radix Select for forms: string values, '' meaning "nothing chosen". */
export function SelectControl({
  value,
  onChange,
  options,
  placeholder = tr('Choose…'),
  allowEmpty,
  emptyLabel = tr('None'),
  disabled,
  loading,
  id,
  ...aria
}: SelectControlProps) {
  return (
    // '' (not undefined) keeps Radix Select controlled while it shows the placeholder.
    <Select value={value === '' ? (allowEmpty ? NONE : '') : value} onValueChange={(v) => onChange(v === NONE ? '' : v)} disabled={disabled || loading}>
      <SelectTrigger id={id} {...aria}>
        <SelectValue placeholder={loading ? tr('Loading…') : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
