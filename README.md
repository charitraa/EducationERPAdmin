# Education ERP — Admin Portal

The web front end for [EducationERP](../EducationERP): one portal for school administrators, office staff,
teachers, students and parents. Every screen talks to the real `/api/v1/` backend; there is no mock data.

## Stack

React 18 · TypeScript · Vite · React Router 6 (data router, lazy routes) · TanStack Query 5 · Axios ·
Tailwind 3 + shadcn/Radix · Lucide · React Hook Form + Zod · Vitest · pnpm

## Getting started

```bash
pnpm install
pnpm dev            # http://localhost:5173 — /api is proxied to http://localhost:8000
```

Point the dev proxy elsewhere with `API_PROXY_TARGET=http://127.0.0.1:8001 pnpm dev`. For a deployed
build, set `VITE_API_BASE_URL` (see `.env.example`).

| Script | What it does |
|---|---|
| `pnpm typecheck` | TypeScript, no emit |
| `pnpm build` | Typecheck + production build |
| `pnpm test` | Unit tests (money, dates, permissions, error mapping) |
| `pnpm api:types` | Regenerate API types and enum labels from the backend's `openapi.yaml` |

## The API contract

`src/shared/api/schema.gen.ts` and `src/shared/api/enums.gen.ts` are generated from
`../EducationERP/docs/api/openapi.yaml` (override with `OPENAPI=…`). Use `Schema<'Program'>` for types and
`enumLabel('RoomTypeEnum', value)` / `enumOptions(...)` to show the backend's labels while sending its
values. Never invent an endpoint: check `docs/api/endpoints.md` in the backend repo first.

## How a feature is built

```
Page → hook (TanStack Query) → feature api (createResourceApi) → apiClient (axios) → backend
```

```
features/academics/programs/
  api/programs.api.ts         createResourceApi('/programs/') + createQueryKeys('programs')
  hooks/usePrograms.ts        createResourceHooks(...) → usePrograms, useCreateProgram, …
  schemas/program.schema.ts   Zod schema, defaults from a record, form → request payload
  components/ProgramFormDialog.tsx
  pages/ProgramsPage.tsx      DataTable + FormDialog + DeleteDialog
```

Shared building blocks:

- **Lists** — `useListState()` keeps page, size, search, ordering and filters in the URL; `<DataTable>` gives
  sorting, filters, pagination, row selection/bulk actions, loading/empty/error states, dense rows on
  desktop and cards on phones.
- **Forms** — `<FormDialog>` (RHF + Zod), `<FormField>`, `<SelectControl>`, `<DatePicker>` (AD stored, BS
  shown), `<FileUpload>`. A server 400 puts `details` under the matching fields and `message` above the form.
- **Errors** — one place (`lib/errors.ts`, `QueryProvider`): 403 → "You can't do this." and a refresh of
  `/auth/me/`; 404 never retried; 409 shows the server's sentence; 429 → "Too many requests".
- **Permissions** — `usePermissions()`, `<PermissionGate>`, `<PermissionRoute>`; menus come from
  `app/navigation.ts` filtered by `me.permissions`. The UI hides; the server decides.
- **Branches** — `useBranches()`: with one campus, no branch selector/column/filter/picker anywhere and forms
  send the only campus automatically. "Add a branch" lives in Settings → Branches.
- **Money** — decimal strings only; `lib/currency.ts` formats and sums via integer paisa (BigInt).
- **Downloads** — `downloadFile(path)` fetches with the auth header as a blob; never a bare `<a href>`.
- **i18n** — `t('nav.students')`; strings in `src/locales/en.ts`, Nepali in `ne.ts` (falls back to English).

## Auth and tokens

The access token lives in memory only. The backend returns the refresh token in the response body (it does
not set an httpOnly cookie yet), so it is kept in `sessionStorage`: one tab, same origin, gone when the tab
closes, never `localStorage`. A 401 triggers one shared refresh (the backend rotates refresh tokens) and a
retry. Only a definite rejection logs the user out; a rate limit or outage shows a retry screen. When the
backend moves refresh tokens into a cookie, only `lib/auth.ts` and `shared/api/client.ts` change.

## What's built

**Done** — sign-in with two-factor codes, session resume and token refresh, the permission-driven shell (sidebar,
breadcrumbs, branch selector, notifications, Ctrl+K, mobile bottom bar, dark mode, Nepali/English), the
dashboard (permission-aware cards, "Waiting for me", setup checklist), the setup wizard, Settings
(organization, branches), and Academics (programs, subjects, curriculum, classes, academic years, terms,
rooms, calendar, departments).

**Next** — every other module already has its menu entry, permission check and route; its page says
"coming soon" until built. Order: people (students, admissions, parents, staff, users, roles), daily operations,
exams, finance, campus operations, HR, community, administration.
