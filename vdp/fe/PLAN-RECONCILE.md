# G1: Plan ↔ code reconcile (2026-08-31)

Child plans W0–W6 / RD* were marked `completed` without artifacts. This pass re-implements foundation in `vdp/fe/src`.

## Present after reconcile

| Artifact | Path |
|----------|------|
| API client | `src/lib/api/client.ts` |
| Auth API | `src/lib/api/auth.ts` |
| Forms/files API | `src/lib/api/forms.ts`, `files.ts` |
| Auth session | `src/lib/auth/session.tsx` (`vdp-auth-v1`) |
| Demo split | `src/routes/demo/*`, `src/lib/ved/demo-mode.ts` |
| Mapper | `src/lib/ved/form-mapper.ts` |
| Action bridge | `src/lib/ved/app-actions.ts`, `action-bridge.ts` |
| Platform create | `src/lib/ved/platform-create.ts` |
| React Query hooks | `src/lib/ved/use-platform-forms.ts` |
| Unit tests | `src/lib/ved/*.test.ts`, `npm test` |
| Playwright | `e2e/*.spec.ts`, `playwright.config.ts` |
| Backend B3 | `ListProjected` on `GET /api/v1/forms` |

## Still partial (honest %)

- App matrix actions: mapped subset; not all 52 Nest paths in bridge
- F6–F9 справочники/admin: demo mock only in app
- RD8–RD11: scaffold tests only
- Staging DOCS/MAIL: script exists; vendor templates not in repo
- `allowed_actions` on GET form (B1): not added — UI uses `app-actions.ts`

## Gate commands

```sh
cd vdp/fe && npm test
cd vdp && make test
cd vdp && make integration-gate   # needs compose + docker npm
```
