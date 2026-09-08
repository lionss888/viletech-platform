# GitLab secondary forge setup

GitHub is canonical for merge, tags vdp-v*, GHCR, and deploy. GitLab group [vdp888](https://gitlab.com/vdp888) is the secondary forge.

## Projects in group vdp888

Project [vdp888/viletech-platform](https://gitlab.com/vdp888/viletech-platform). Role: mirror of this monorepo (lionss888/viletech-platform). Sync: workflow VDP Mirror to GitLab via GitHub secrets GITLAB_MIRROR_URL, GITLAB_MIRROR_TOKEN, and GITLAB_REGISTRY_PROJECT.

Project [vdp888/vdp](https://gitlab.com/vdp888/vdp). Role: Lovable UI repo (GitHub source lionss888/vdp). Sync: not pushed by vdp-mirror-gitlab.yml. Keep in sync via GitLab import or pull-mirror from GitHub, or Lovable’s own GitHub remote. Platform pulls UI via vdp-lovable-sync.yml from GitHub lionss888/vdp.

Do not point GITLAB_MIRROR_URL at vdp888/vdp — that would overwrite the Lovable tree with the monorepo.

Docs previously mentioned sandbox6902635 as a planning placeholder. Canonical group is vdp888.

## One-time setup (monorepo mirror)

### GitLab project viletech-platform

Reuse the imported project [vdp888/viletech-platform](https://gitlab.com/vdp888/viletech-platform). Protect main: Maintainers cannot push; disable MR merge to default branch if you want mirror-only (merge only on GitHub).

Create a Project Access Token on viletech-platform or a Group Access Token / PAT with write_repository (required for mirror push) and write_registry / read_registry (recommended so vdp-images can crane-copy digests into this project’s registry).

### GitHub repository secrets (monorepo)

Secret GITLAB_MIRROR_URL. Value https://gitlab.com/vdp888/viletech-platform.

Secret GITLAB_MIRROR_TOKEN. Value: GitLab token (glpat-…).

Secret GITLAB_REGISTRY_PROJECT. Value vdp888/viletech-platform.

Helper (does not echo the token):

```sh
export GITLAB_MIRROR_TOKEN='glpat-…'
./vdp/scripts/configure-gitlab-mirror.sh
# defaults already use https://gitlab.com/vdp888/viletech-platform
```

Requires [GitHub CLI](https://cli.github.com/) logged in with permission to set repo secrets.

### Verify monorepo sync

Step one. Actions → VDP Mirror to GitLab → Run workflow (main).

Step two. Job must fail if secrets are missing (no silent skip on push).

Step three. On GitLab viletech-platform, main tip SHA matches GitHub main.

Workflow: [.github/workflows/vdp-mirror-gitlab.yml](../../../.github/workflows/vdp-mirror-gitlab.yml).

### Optional: Lovable repo on GitLab (vdp888/vdp)

If you want GitLab to track Lovable independently: in [vdp888/vdp](https://gitlab.com/vdp888/vdp) open Settings → Repository → Mirroring repositories. Pull mirror from https://github.com/lionss888/vdp.git (or the URL Lovable pushes to). Platform sync into vdp/fe still uses GitHub: workflow vdp-lovable-sync.yml / var LOVABLE_REPO (default lionss888/vdp).

## Parallel workflow (monorepo)

Action feature branch. On GitHub: PR. On GitLab viletech-platform: optional MR.

Action merge to main. On GitHub: yes (canonical). On GitLab: no — mirror only.

Action CI fast/docs. On GitHub: Actions. On GitLab: .gitlab-ci.yml.

Action integration/playwright. On GitHub: Actions (PR/main). On GitLab: schedule or manual MR.

Action images and deploy. On GitHub: Actions. On GitLab: promote without rebuild when Environment secrets exist (wave 3).

Action Lovable UI into platform. On GitHub: vdp-lovable-sync.yml PR into vdp/fe. Source of truth for UI remains GitHub lionss888/vdp (optional GitLab mirror vdp888/vdp).

Feature work on GitLab monorepo: push branch → MR for review → land via GitHub PR.

## GitLab CI variables (optional)

Wave 3 promote jobs read DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH, DEPLOY_SSH_KEY from GitLab Environments. Until those are set, promote jobs exit 0 with a skip message.

Variable GITLAB_REGISTRY. Default registry.gitlab.com.

Variable GITLAB_REGISTRY_PROJECT. Example vdp888/viletech-platform.

Deploy secrets for alpha, beta, gamma, demo, and test live in GitHub Environments. Digests stay identical to GHCR via crane copy in Images.
