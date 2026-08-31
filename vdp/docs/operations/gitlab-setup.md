# GitLab secondary forge setup

GitHub (remote origin) is canonical: merge to main, tags vdp-v*, GHCR images, deploy workflows.

GitLab group sandbox6902635 hosts a mirror project (recommended name: viletech-platform) for parallel branches/MR and CI.

## One-time setup

Step 1. Create empty project sandbox6902635/viletech-platform on gitlab.com (no README init if mirroring).

Step 2. Protect main on GitLab: Maintainers cannot push; disable MR merge to default branch (merge only on GitHub).

Step 3. GitHub repository secrets. Secret GITLAB_MIRROR_URL, e.g. https://gitlab.com/sandbox6902635/viletech-platform. Secret GITLAB_MIRROR_TOKEN, a GitLab PAT with write_repository scope (project access token or group token). Secret GITLAB_REGISTRY_PROJECT, e.g. sandbox6902635/viletech-platform, used as the image copy target.

Step 4. GitHub Environments alpha, beta and gamma (gamma: required reviewers). Per-environment secrets: DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH (e.g. /opt/vdp), and DEPLOY_SSH_KEY, the private key for the deploy user.

Step 5. Optional: GitLab, then Settings, then Repository, then Mirroring repositories (pull from GitHub) as backup; primary push is workflow vdp-mirror-gitlab.yml.

## Parallel workflow

Action Feature branch. On GitHub: PR. On GitLab: MR (optional).

Action Merge to main. On GitHub: yes. On GitLab: no, mirror only.

Action CI fast/docs. On GitHub: Actions. On GitLab: .gitlab-ci.yml.

Action Integration/playwright. On GitHub: main, label or nightly. On GitLab: default branch, schedule or manual MR.

Action Images plus deploy. On GitHub: Actions only. On GitLab: none.

Feature work on GitLab: push branch, then open MR on GitLab for review, then merge via GitHub PR (push the same branch to GitHub or use the mirror bot).

Commits from mirror use author vdp-mirror-bot and message suffix [skip mirror-loop] on default-branch sync to avoid CI loops.

## GitLab CI variables (optional)

No deploy secrets for alpha, beta or gamma in GitLab CI. For image copy verification only.

Variable GITLAB_REGISTRY, default registry.gitlab.com.

Variable GITLAB_REGISTRY_PROJECT, e.g. sandbox6902635/viletech-platform.

Deploy secrets live in GitHub Environments alpha, beta and gamma only.
