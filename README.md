# Education ERP — Admin Panel

React + TypeScript admin dashboard for [EducationERP](../EducationERP), built directly on top of
[CoolAdmin](../CoolAdmin)'s real stylesheets and markup — not a Tailwind reinterpretation. Every
page renders CoolAdmin's actual CSS classes (`.m-card`, `.m-btn`, `.m-table`, `.page-header`,
Bootstrap's `.form-control`/`.modal`/`.badge`, the real `.menu-sidebar`/`.header-desktop` chrome).

## Stack

- **Vite + React 19 + TypeScript**
- **CoolAdmin's own CSS**, vendored as static files: Bootstrap 5.3.8, Font Awesome 7.3.1,
  `theme.css` (legacy) and `app.css` (the modern `body.app { --m-* }` overlay CoolAdmin's own
  pages actually use) — see `public/vendor/cooladmin/` and `index.html`'s `<link>` chain. No
  Tailwind: see **Styling** below for why, and how the few remaining utility classNames work.
- **TanStack Query** — server state, with a typed cache-key factory (`src/lib/query/keys.ts`)
- **React Router v7**, **React Hook Form + Zod**, **Zustand**, **axios**

## Styling

`public/vendor/cooladmin/` holds CoolAdmin's actual `bootstrap.min.css`, `theme.css` and `app.css`,
copied verbatim from `../CoolAdmin` and loaded in `index.html` in that order, before our own
`src/index.css`. `components/ui/*` and `components/layout/*` render CoolAdmin's real classes
directly (`.m-card`, `.m-btn--primary`, `.form-control`, `.modal-dialog`, `.menu-sidebar`, ...) —
open `../CoolAdmin/*.html` or its `docs.html` to see the source of truth for any of these.

Tailwind was deliberately removed rather than kept alongside Bootstrap: both frameworks define
utility classes under the *same names* (`.p-3`, `.gap-2`, `.rounded`, `.text-danger`, `.shadow-sm`,
...) with different pixel values, and CSS has no reliable way to make one win over the other by
source order alone. A handful of feature pages still use small Tailwind-style utility classNames
for one-off layout — rather than rewrite every page, `src/index.css`'s "Compat utilities" section
hand-defines exactly that subset (see the comment there), scoped under `body.app` with `!important`
so they deterministically beat any same-named Bootstrap utility regardless of load order. New code
should prefer Bootstrap's own utilities (`d-flex`, `gap-3`, `mb-3`, ...) or a real CoolAdmin class
over adding to that compat list.

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
  index.css                Extensions CoolAdmin's own CSS doesn't ship (button variants,
                            neutral badge, underline tabs) + the compat utilities layer
  vite-env.d.ts             Typed import.meta.env

public/vendor/cooladmin/    CoolAdmin's real bootstrap.min.css / theme.css / app.css / Font
                            Awesome, vendored verbatim — linked from index.html

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
