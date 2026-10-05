// Checks the Nepali catalog against the English the app actually shows.
//
//   pnpm i18n:check            # report; exits 1 if anything is missing or wrong
//   pnpm i18n:check --todo     # also print each missing string, grouped by area
//
// Page text is keyed by its English: `tr('Save changes')`, `trc('verb', 'Open')`
// (key `verb|Open`). Translations live in src/locales/ne-text/<area>.ts. Besides
// tr()/trc() literals, these are shown through tr() at run time and so need
// entries too: pluralize() nouns, `one`/`many` nouns, humanized StatusBadge and
// audit-module values, enum labels, and the built-in role texts below.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'

const ROOT = 'src'
const CATALOG = 'src/locales/ne-text'
const showTodo = process.argv.includes('--todo')

/** Sent by the backend as data and translated where shown. */
const BACKEND_TEXT = [
  'Organization Administrator', 'Full control over one organization.',
  'Campus Administrator', 'Manages users and campuses within an assigned campus.',
  'Staff', 'Baseline read access for employees.',
  'Parent', 'Baseline role for parents/guardians.',
  'Student', 'Baseline role for students; module access is added per phase.',
]

const walk = (dir, out = []) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(f) && !/\.test\.|\/locales\//.test(p)) out.push(p)
  }
  return out
}
const parse = (file) => ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
const humanized = (v) => {
  const s = v.replace(/[_-]+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// --- What the app shows ---------------------------------------------------
const wanted = new Map() // English → area
const want = (text, area) => wanted.has(text) || wanted.set(text, area)
const areaOf = (file) => relative(ROOT, file).match(/^features\/([^/]+)/)?.[1] ?? 'common'

for (const file of walk(ROOT)) {
  const area = areaOf(file)
  const visit = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      const [a, b, c] = n.arguments
      const name = n.expression.text
      if (name === 'tr' && a && ts.isStringLiteralLike(a)) want(a.text, area)
      if (name === 'trc' && a && b && ts.isStringLiteralLike(a) && ts.isStringLiteralLike(b)) want(`${a.text}|${b.text}`, area)
      if (name === 'pluralize' && b && ts.isStringLiteralLike(b)) {
        want(b.text, 'common')
        want(c && ts.isStringLiteralLike(c) ? c.text : `${b.text}s`, 'common')
      }
    }
    if (ts.isPropertyAssignment(n) && ['one', 'many'].includes(n.name.getText()) && ts.isStringLiteralLike(n.initializer)) want(n.initializer.text, 'common')
    ts.forEachChild(n, visit)
  }
  visit(parse(file))
}
const statuses = readFileSync('src/shared/constants/statuses.ts', 'utf8')
for (const m of statuses.slice(statuses.indexOf('STATUS_STYLES')).matchAll(/^\s+'?([a-z_]+)'?: \{/gm)) want(humanized(m[1]), 'common')
const modules = readFileSync('src/features/audit/AuditLogPage.tsx', 'utf8').match(/const MODULES = \[([^\]]+)\]/)
for (const m of modules ? modules[1].matchAll(/'([a-z_]+)'/g) : []) want(humanized(m[1]), 'audit')
for (const m of readFileSync('src/shared/api/enums.gen.ts', 'utf8').matchAll(/^\s+"?[\w-]+"?: "((?:[^"\\]|\\.)*)",?$/gm)) want(JSON.parse(`"${m[1]}"`), 'enums')
for (const t of BACKEND_TEXT) want(t, 'roles')

// --- What the catalog has --------------------------------------------------
const have = new Map() // English → { file, value }
const problems = []
for (const f of readdirSync(CATALOG)) {
  const visit = (n) => {
    if (ts.isPropertyAssignment(n) && ts.isStringLiteralLike(n.name) && ts.isStringLiteralLike(n.initializer)) {
      const key = n.name.text
      const value = n.initializer.text
      if (have.has(key)) problems.push(`${f}: "${key}" is also in ${have.get(key).file}`)
      have.set(key, { file: f, value })
      const text = key.includes('|') ? key.slice(key.indexOf('|') + 1) : key
      const placeholders = new Set(text.match(/\{\w+\}/g) ?? [])
      for (const p of value.match(/\{\w+\}/g) ?? []) if (!placeholders.has(p)) problems.push(`${f}: "${key}" → "${value}" uses ${p}, which the English doesn't have`)
    }
    ts.forEachChild(n, visit)
  }
  visit(parse(join(CATALOG, f)))
}

// --- Report ----------------------------------------------------------------
const missing = [...wanted].filter(([k]) => !have.has(k))
const stale = [...have.keys()].filter((k) => !wanted.has(k))
console.log(`${wanted.size} strings shown · ${have.size} translated · ${missing.length} missing · ${stale.length} no longer used · ${problems.length} problems`)
for (const p of problems) console.log(`  ✗ ${p}`)
for (const k of stale) console.log(`  · unused: "${k}" (${have.get(k).file})`)
if (missing.length) {
  const byArea = {}
  for (const [k, a] of missing) (byArea[a] ??= []).push(k)
  for (const [a, list] of Object.entries(byArea).sort()) {
    console.log(`  ${a}: ${list.length} missing → src/locales/ne-text/${a}.ts`)
    if (showTodo) for (const k of list.sort()) console.log(`      ${JSON.stringify(k)}`)
  }
}
process.exit(missing.length || problems.length ? 1 : 0)
