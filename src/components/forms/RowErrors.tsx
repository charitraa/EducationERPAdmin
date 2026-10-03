/** The first message of each row of a field array, e.g. "Charge 2: An amount like 1500…". */
export function RowErrors({ errors, label }: { errors: unknown; label: string }) {
  if (!Array.isArray(errors)) return null
  const lines = errors
    .map((row, i) => {
      if (!row || typeof row !== 'object') return null
      const first = Object.values(row as Record<string, { message?: string } | undefined>).find((e) => e?.message)
      return first?.message ? `${label} ${i + 1}: ${first.message}` : null
    })
    .filter(Boolean)
  if (!lines.length) return null
  return (
    <ul className="text-sm text-danger" role="alert">
      {lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
  )
}
