# GitLab secondary forge setup

GitHub is canonical for merge, tags `vdp-v*`, GHCR, and deploy. GitLab group **[vdp888](https://gitlab.com/vdp888)** is the secondary forge.

## Projects in group `vdp888`

| GitLab project | Role | Sync |
|---|---|---|
| [`vdp888/viletech-platform`](https://gitlab.com/vdp888/viletech-platform) | Mirror of this monorepo (`lionss888/viletech-platform`) | **VDP Mirror to GitLab** → secrets `GITLAB_MIRROR_*` |
| [`vdp888/vdp`](https://gitlab.com/vdp888/vdp) | Lovable UI repo (GitHub source: `lionss888/vdp`) | **Not** pushed by `vdp-mirror-gitlab.yml`. Keep in sync via GitLab import/pull-mirror from GitHub, or Lovable’s own GitHub remote. Platform pulls UI via `vdp-lovable-sync.yml` from **GitHub** `lionss888/vdp` |

Do not point `GITLAB_MIRROR_URL` at `vdp888/vdp` — that would overwrite the Lovable tree with the monorepo.

Docs previously mentioned `sandbox6902635` — planning placeholder; **canonical group is `vdp888`**.

## One-time setup (monorepo mirror)

### 1. GitLab project `viletech-platform`

Reuse the imported project [vdp888/viletech-platform](https://gitlab.com/vdp888/viletech-platform). Protect `main`: Maintainers cannot push; disable MR merge to default branch if you want mirror-only (merge only on GitHub).

Create a **Project Access Token** (on `viletech-platform`) or **Group Access Token** / PAT with:

- `write_repository` (required for mirror push)
- `write_registry` / `read_registry` (recommended so `vdp-images` can crane-copy digests into this project’s registry)

### 2. GitHub repository secrets (monorepo)

| Secret | Value |
|---|---|
| `GITLAB_MIRROR_URL` | `https://gitlab.com/vdp888/viletech-platform` |
| `GITLAB_MIRROR_TOKEN` | GitLab token (`glpat-…`) |
| `GITLAB_REGISTRY_PROJECT` | `vdp888/viletech-platform` |

Helper (does not echo the token):

```sh
export GITLAB_MIRROR_TOKEN='glpat-…'
./vdp/scripts/configure-gitlab-mirror.sh
# defaults already use https://gitlab.com/vdp888/viletech-platform
```

Requires [GitHub CLI](https://cli.github.com/) logged in with permission to set repo secrets.

### 3. Verify monorepo sync

1. Actions → **VDP Mirror to GitLab** → Run workflow (`main`).
2. Job must **fail** if secrets are missing (no silent skip on push).
3. On GitLab `viletech-platform`, `main` tip SHA matches GitHub `main`.

Workflow: [`.github/workflows/vdp-mirror-gitlab.yml`](../../../.github/workflows/vdp-mirror-gitlab.yml).

### 4. Optional: Lovable repo on GitLab (`vdp888/vdp`)

If you want GitLab to track Lovable independently:

1. In [vdp888/vdp](https://gitlab.com/vdp888/vdp) → Settings → Repository → Mirroring repositories.
2. Pull mirror from `https://github.com/lionss888/vdp.git` (or the URL Lovable pushes to).
3. Platform sync into `vdp/fe` still uses GitHub: workflow `vdp-lovable-sync.yml` / var `LOVABLE_REPO` (default `lionss888/vdp`).

## Parallel workflow (monorepo)

| Action | GitHub | GitLab (`viletech-platform`) |
|---|---|---|
| Feature branch | PR | optional MR |
| Merge to main | yes (canonical) | no — mirror only |
| CI fast/docs | Actions | `.gitlab-ci.yml` |
| Integration/playwright | Actions (PR/main) | schedule / manual MR |
| Images + deploy | Actions | promote without rebuild when Environment secrets exist (wave 3) |
| Lovable UI into platform | `vdp-lovable-sync.yml` PR into `vdp/fe` | source of truth for UI remains GitHub `lionss888/vdp` (± GitLab `vdp888/vdp` mirror) |

Feature work on GitLab monorepo: push branch → MR for review → land via GitHub PR.

## GitLab CI variables (optional)

Wave 3 promote jobs read `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY` from GitLab Environments. Until those are set, promote jobs exit 0 with a skip message.

| Variable | Default / example |
|---|---|
| `GITLAB_REGISTRY` | `registry.gitlab.com` |
| `GITLAB_REGISTRY_PROJECT` | `vdp888/viletech-platform` |

Deploy secrets for alpha/beta/gamma/demo/test live in **GitHub Environments**. Digests stay identical to GHCR via crane copy in Images.
