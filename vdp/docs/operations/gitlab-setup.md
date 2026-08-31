# GitLab secondary forge setup

GitHub (`origin`) is **canonical**: merge to `main`, tags `vdp-v*`, GHCR images, deploy workflows.

GitLab group **sandbox6902635** hosts a mirror project (recommended name: `viletech-platform`) for parallel branches/MR and CI.

## One-time setup

1. Create empty project `sandbox6902635/viletech-platform` on gitlab.com (no README init if mirroring).
2. Protect `main` on GitLab: **Maintainers cannot push**; disable MR merge to default branch (merge only on GitHub).
3. GitHub repository secrets:
   - `GITLAB_MIRROR_URL` — e.g. `https://gitlab.com/sandbox6902635/viletech-platform`
   - `GITLAB_MIRROR_TOKEN` — GitLab PAT with `write_repository` (project access token or group token).
   - `GITLAB_REGISTRY_PROJECT` — e.g. `sandbox6902635/viletech-platform` (image copy target).
4. GitHub Environments `staging` and `production` (production: required reviewers):
   - `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH` (e.g. `/opt/vdp`)
   - `DEPLOY_SSH_KEY` — private key for deploy user
5. Optional: GitLab → Settings → Repository → Mirroring repositories (pull from GitHub) as backup; primary push is workflow `vdp-mirror-gitlab.yml`.

## Parallel workflow

| Action | GitHub | GitLab |
|--------|--------|--------|
| Feature branch | PR | MR (optional) |
| Merge to main | **yes** | no (mirror only) |
| CI fast/docs | Actions | `.gitlab-ci.yml` |
| Integration/playwright | main / label / nightly | default branch / schedule / manual MR |
| Images + deploy | Actions only | — |

Feature work on GitLab: push branch → open MR on GitLab for review → merge via GitHub PR (push same branch to GitHub or use mirror bot).

Commits from mirror use author `vdp-mirror-bot` and message suffix `[skip mirror-loop]` on default-branch sync to avoid CI loops.

## GitLab CI variables (optional)

No staging/prod secrets in GitLab CI. For image copy verification only:

- `GITLAB_REGISTRY` — default `registry.gitlab.com`
- `GITLAB_REGISTRY_PROJECT` — e.g. `sandbox6902635/viletech-platform`

Deploy secrets live in GitHub Environments `staging` and `production` only.
