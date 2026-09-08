# GitLab secondary forge setup

GitHub (remote origin) is canonical: merge to main, tags `vdp-v*`, GHCR images, deploy workflows.

GitLab group **[vdp888](https://gitlab.com/vdp888)** hosts the mirror project (default name: `viletech-platform`) for parallel branches/MR and CI. Docs previously mentioned `sandbox6902635` — that was a planning placeholder; **canonical group is `vdp888`**.

## One-time setup

### 1. GitLab project

Create or reuse project `vdp888/viletech-platform` (import from GitHub is fine as a starting snapshot). Protect `main`: Maintainers cannot push; disable MR merge to default branch if you want mirror-only (merge only on GitHub).

Create a **Project Access Token** or **Group Access Token** / PAT with:

- `write_repository` (required for mirror push)
- `write_registry` / `read_registry` (recommended so `vdp-images` can crane-copy digests)

### 2. GitHub repository secrets

| Secret | Example |
|---|---|
| `GITLAB_MIRROR_URL` | `https://gitlab.com/vdp888/viletech-platform` |
| `GITLAB_MIRROR_TOKEN` | GitLab token (`glpat-…`) |
| `GITLAB_REGISTRY_PROJECT` | `vdp888/viletech-platform` (image copy target) |

Helper (does not echo the token):

```sh
export GITLAB_MIRROR_TOKEN='glpat-…'   # your token
./vdp/scripts/configure-gitlab-mirror.sh
# optional:
# ./vdp/scripts/configure-gitlab-mirror.sh --url https://gitlab.com/vdp888/<other-project>
```

Requires [GitHub CLI](https://cli.github.com/) logged in with permission to set repo secrets.

### 3. Verify sync

1. Actions → **VDP Mirror to GitLab** → Run workflow (`main`).
2. Job must **fail** if secrets are missing (no silent skip on push).
3. On GitLab, `main` tip SHA matches GitHub `main`.

Primary push path: workflow [`.github/workflows/vdp-mirror-gitlab.yml`](../../../.github/workflows/vdp-mirror-gitlab.yml). Optional: GitLab → Settings → Repository → Mirroring repositories (pull from GitHub) as backup only.

## Parallel workflow

| Action | GitHub | GitLab |
|---|---|---|
| Feature branch | PR | optional MR |
| Merge to main | yes (canonical) | no — mirror only |
| CI fast/docs | Actions | `.gitlab-ci.yml` |
| Integration/playwright | Actions (PR/main) | schedule / manual MR |
| Images + deploy | Actions | promote without rebuild when Environment secrets exist (wave 3) |
| Lovable UI | `vdp-lovable-sync.yml` PR into `vdp/fe` | — |

Feature work on GitLab: push branch → MR for review → land via GitHub PR (same branch on GitHub).

Commits mirrored as-is (authors preserved). GitLab `.gitlab-ci.yml` skips some default-branch pipelines for `vdp-mirror-bot` / `[skip mirror-loop]` when those apply; protect GitLab `main` so it is not a second merge target.

## GitLab CI variables (optional)

Wave 3 promote jobs read `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY` from GitLab Environments. Until those are set, promote jobs exit 0 with a skip message.

| Variable | Default / example |
|---|---|
| `GITLAB_REGISTRY` | `registry.gitlab.com` |
| `GITLAB_REGISTRY_PROJECT` | `vdp888/viletech-platform` |

Deploy secrets for alpha/beta/gamma/demo/test live in **GitHub Environments**. Digests stay identical to GHCR via crane copy in Images.
