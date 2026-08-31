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

Demo contour (`/demo/*`, `ved-demo-state-v2`) is isolated from JWT app. Seed logins: app `*@vdp.local`, demo `*@demo.vdp.local`.

Last UI sync from `lovable-vdp` (`lionss888/vdp@dev0` / `d4289683`) kept the app overlay above.

## Where the live UI lives

Lovable keeps screen markup inline in `src/routes/*.tsx`; the app contour extracted it into
`src/components/ved/pages/*` plus shared `src/routes/demo/*` page components reused by the root
routes. So after a sync, Lovable's route files are **reference only** — their UI deltas must be
ported into the page components, otherwise `/dashboard` and `/forms` keep the pre-sync layout.
Same for the shell: `VedAppShell.tsx` is live, `AppShell.tsx` is the Lovable reference copy.

Ported from `d4289683`: responsive dashboard lists and the 3-card summary, registry stage
filters plus the mobile card list, full-width mobile CTAs, persisted `Справочники` group,
documents upload/delete (`addDocuments` / `deleteDocument`). Document delete has no core API,
so it stays demo-only.
