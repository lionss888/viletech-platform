<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## App integration modules (do not drop on UI-only sync)

Lovable sync must **not** remove or replace these without re-running `make integration-gate`:

- `src/lib/api/*`, `src/lib/auth/*`, `src/lib/ved/platform-store.ts`, `action-bridge.ts`, `app-actions.ts`
- App routes: `/login`, `/forms/*`, `/dashboard` (not under `/demo`)
- `vitest.config.ts`, `src/**/*.test.ts`, `e2e/`, `playwright.config.ts`
- `src/lib/ved/demo-seed-overlay.ts` (demo-only seed patches; keep `mock.ts` = Lovable)

Demo contour (`/demo/*`, `ved-demo-state-v2`) is isolated from JWT app. Seed logins: app `*@vdp.local`, demo `*@demo.vdp.local`.

Last UI sync from `lovable-vdp` (`lionss888/vdp@dev0` / `9f4c9ee5`). Remote fetch may need credentials; local ref is the sync baseline. Guard: `make lovable-seed-check`.

## Where the live UI lives

Lovable keeps screen markup inline in `src/routes/*.tsx`; the app contour extracted it into
`src/components/ved/pages/*` plus shared `src/routes/demo/*` page components reused by the root
routes. So after a sync, Lovable's route files are **reference only** — their UI deltas must be
ported into the page components, otherwise `/dashboard` and `/forms` keep the pre-sync layout.
Same for the shell: `VedAppShell.tsx` is live, `AppShell.tsx` is the Lovable reference copy.
Nav lives in `nav-config.ts` (`Документы` is first under `Справочники`, matching Lovable).

Ported through `9f4c9ee5`: page components stay live (`forms-new`, `form-detail`, process-roles,
document upload/extraction, address autocomplete). Root routes remain thin wrappers; `VedAppShell`
is live, `AppShell` is Lovable reference.

## Demo vs app capability boundary (not 100% parity)

| Capability | Demo | App (core API) |
|---|---|---|
| Role switcher in sidebar | yes | no (JWT role) |
| Document delete | yes | disabled — no core API |
| Document upload without file | mock metadata ok | requires real file |
| Unknown form actions | local store | error «недоступно в app-режиме» |
| Seed overlay (`ВЭД-2026-0120a`, `@demo.vdp.local` emails) | yes via `demo-seed-overlay` | N/A (API seed) |
