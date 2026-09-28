# Education ERP — Admin Panel

React + TypeScript admin dashboard for [EducationERP](../EducationERP), themed to match
[CoolAdmin](../CoolAdmin)'s modern design system (`css/app.css`, `body.app { --m-* }` tokens,
Inter, `theme-blue`).

## Stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4** — design tokens ported from CoolAdmin's `--m-*` variables into `src/index.css`
- **TanStack Query** — server state, with a typed cache-key factory (`src/lib/query/keys.ts`)
- **React Router v7**, **React Hook Form + Zod**, **Zustand**, **axios**

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
```

No backend is required out of the box — see **Dummy-data mode** below. To point at a real
EducationERP backend instead, copy `.env.example` to `.env` and set `VITE_USE_MOCKS=false`.

Other scripts: `npm run build` (typecheck + production build), `npm run lint` (oxlint),
`npm run preview` (serve the production build locally).

## Dummy-data mode

`VITE_USE_MOCKS` defaults to **on**. In this mode every `src/lib/api/*.ts` module serves an
in-memory seed dataset (`src/mocks/data/`) instead of calling a backend, and the app
auto-signs-in as a mock superuser so every page and permission gate is visible with zero setup.
Writes (create/update/status changes/role assignments/admission decisions/...) mutate the same
in-memory arrays, so they persist for the browser session but reset on reload.

Turn it off once a real backend is running:

```bash
cp .env.example .env
# edit .env: VITE_USE_MOCKS=false, VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Folder structure

```
src/
  App.tsx                  Providers only (QueryClient, BrowserRouter, Toaster)
  main.tsx                 React root
  index.css                Design tokens (ported from CoolAdmin) + Tailwind v4 @theme
  vite-env.d.ts             Typed import.meta.env

  routes/                  Route tree + auth/permission route guards
    AppRoutes.tsx
    ProtectedRoute.tsx      ProtectedRoute, PermissionRoute (currently unwired — see TEMP note)

  components/
    ui/                     Design-system primitives (Button, Card, Modal, DataTable, ...)
    layout/                 App shell: Sidebar, Topbar, AppShell, nav-config
    common/                 Cross-cutting, non-primitive components (PermissionGate)

  features/<name>/          One folder per domain: auth, dashboard, profile, organizations,
                             campuses, users, roles, audit, students, staff, parents, admissions
    hooks.ts                 TanStack Query hooks for this resource (list/detail/create/update/...)
    <Name>ListPage.tsx
    <Name>FormDialog.tsx
    <Name>DetailPage.tsx     (where the resource has one)

  lib/
    api/                    One file per REST resource: types + axios calls (+ mock branch)
      client.ts              axios instance, token refresh, 401 handling
      crud.ts                createCrudApi() — generic list/get/create/update/patch/remove
      errors.ts               ApiError, toApiError()
      types.ts                Shared envelope/DTO types (PaginatedEnvelope, CurrentUser, ...)
    query/
      client.ts                QueryClient instance + retry policy
      keys.ts                  createQueryKeys() cache-key factory
      useResource.ts           createResourceHooks() — generic CRUD hooks built on keys.ts
    utils.ts                  cn(), formatDate(), initials(), titleCase()

  mocks/                    Dummy-data layer (see "Dummy-data mode" above)
    data/                    One seed file per resource
    mock-crud.ts              createMockCrudApi(), mockAware() — mirrors lib/api/crud.ts
    pagination.ts             mockPaginate(), mockFilter()

  stores/                  Zustand stores (auth-store, toast-store)
  config/
    env.ts                  The only file that reads import.meta.env directly
```

**Conventions**

- A resource's TanStack Query hooks live in `features/<name>/hooks.ts` and are built with
  `createResourceHooks()`, which returns both the hooks and a `keys` cache-key factory — custom
  mutations in the same file (e.g. a status-change action) invalidate through that same `keys`
  object rather than hand-typing query keys.
- `lib/api/<resource>.ts` owns that resource's TypeScript types, its real axios calls, *and* its
  dummy-data branch side by side — so the two stay obviously in sync when one changes.
- Pages are permission-gated with `<PermissionGate any={[...]}>` (hide) and route-level
  `<PermissionRoute any={[...]}>` (redirect); auth/permission gating is currently stripped out of
  `routes/AppRoutes.tsx` for open browsing — see the `TEMP` comments there and in
  `components/layout/Sidebar.tsx` for how to re-enable it.

## Status

- **Phase 1 (Identity)** — organizations, campuses, users, roles, audit log: done.
- **Phase 2 (Students)** — students, staff, parents, admissions: done.
- Phases 3–8 (academics/timetable, attendance, examinations, finance, events,
  notifications/notices/communication/support) are not built yet.
