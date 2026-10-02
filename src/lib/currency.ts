/**
 * Money arrives as a decimal string ("1500.00") and stays one. Display and
 * arithmetic go through integer paisa (BigInt), never JavaScript floats.
 */
const MONEY_RE = /^(-)?(\d+)(?:\.(\d{1,2})\d*)?$/

/** "1500.5" → 150050n paisa. Returns null for anything that isn't a decimal. */
export function toPaisa(value: string | number | null | undefined): bigint | null {
  if (value === null || value === undefined || value === '') return null
  const m = MONEY_RE.exec(String(value).trim())
  if (!m) return null
  const [, sign, whole, frac = ''] = m
  const paisa = BigInt(whole!) * 100n + BigInt(frac.padEnd(2, '0'))
  return sign ? -paisa : paisa
}

/** 150050n → "1500.50", the form the API accepts. */
export function fromPaisa(paisa: bigint): string {
  const negative = paisa < 0n
  const abs = negative ? -paisa : paisa
  const whole = abs / 100n
  const frac = (abs % 100n).toString().padStart(2, '0')
  return `${negative ? '-' : ''}${whole}.${frac}`
}

export function sumMoney(values: Array<string | null | undefined>): string {
  return fromPaisa(values.reduce<bigint>((acc, v) => acc + (toPaisa(v) ?? 0n), 0n))
}

/** South Asian grouping: 1234567.00 → 12,34,567.00 */
function groupLakh(whole: string) {
  if (whole.length <= 3) return whole
  const last3 = whole.slice(-3)
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${rest},${last3}`
}

function groupThousands(whole: string) {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export interface MoneyFormat {
  currency?: string
  /** 'lakh' (12,34,567) or 'international' (1,234,567). */
  grouping?: 'lakh' | 'international'
}

/** "1500.00" → "NPR 1,500.00". Unparseable input is shown as given. */
export function formatMoney(value: string | number | null | undefined, opts: MoneyFormat = {}): string {
  const { currency = 'NPR', grouping = 'international' } = opts
  const paisa = toPaisa(value)
  if (paisa === null) return value === null || value === undefined || value === '' ? '—' : String(value)
  const [whole, frac] = fromPaisa(paisa < 0n ? -paisa : paisa).split('.')
  const grouped = grouping === 'lakh' ? groupLakh(whole!) : groupThousands(whole!)
  return `${paisa < 0n ? '−' : ''}${currency} ${grouped}.${frac}`
}
