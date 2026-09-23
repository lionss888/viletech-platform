# Environment Requirements

Canonical versions and setup for local development must match CI exactly to avoid version mismatches that cause cryptic build failures.

## Required Versions

### Node.js
Version 22.17.0 from vdp/fe/.nvmrc
Package manager npm 10.9.2 or higher

### Go
Version 1.22 from vdp/.go-version. CI reads the same file into setup-go.
Local check: make check-env-parity compares go version major.minor to that file before commit.

### Docker
Docker Engine 24.0 or higher
Docker Compose 2.20 or higher

### Python
Version 3.11 or higher for ML extraction modules

## Setup Instructions

### Node.js Setup

Using nvm (recommended):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
cd vdp/fe
nvm install
nvm use
```

Using mise (alternative):

```bash
curl https://mise.run | sh
cd vdp/fe
mise use node@$(cat .nvmrc)
```

Verify:

```bash
node --version
npm --version
```

Expected output: v22.17.0 and 10.9.2 or higher.

### Go Setup

Using gvm (recommended):

```bash
bash < <(curl -s -S -L https://raw.githubusercontent.com/moovweb/gvm/master/binscripts/gvm-installer)
gvm install go1.22
gvm use go1.22 --default
```

Direct install from https://go.dev/dl/ selecting Go 1.22.x.

Verify:

```bash
go version
```

Expected output: go version go1.22.x (major.minor must match vdp/.go-version).

Before commit, run make check-env-parity from the vdp directory. Local gates and the pre-commit hook prefer an already downloaded toolchain under HOME/sdk/go1.22.x (or brew go@1.22 / gvm) even when a newer Go is first on PATH. If none is found, the check fails until Go 1.22.x is installed:

```bash
go install golang.org/dl/go1.22.12@latest
go1.22.12 download
```

### Docker Setup

macOS:

```bash
brew install --cask docker
```

Or download from https://www.docker.com/products/docker-desktop.

Linux:

```bash
curl -fsSL https://get.docker.com | sh
```

Verify:

```bash
docker --version
docker compose version
```

Expected output: 24.0+ and 2.20+.

## Environment Parity Check

Before committing ensure your local environment matches CI requirements:

```bash
cd vdp
make check-env-parity
```

This check runs automatically in the pre-commit hook.

## Common Issues

Node.js version mismatch symptom: Tests fail locally or in CI with cryptic Vite/Vitest errors like this.bridge.setTestsError is not a function.

Fix:

```bash
cd vdp/fe
nvm use
rm -rf node_modules package-lock.json
npm install
```

Go version mismatch symptom: Build fails with go directive in go.mod requires newer version.

Fix:

```bash
gvm use go1.22
```

Docker Compose not found symptom: make compose-up fails with command not found docker-compose.

Fix for Linux without Docker Desktop:

```bash
mkdir -p ~/.docker/cli-plugins/
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
```

macOS and Linux with Docker Desktop already include compose v2.

## Syncing After git pull

After pulling changes that update dependencies or versions:

```bash
cd vdp
make check-env-parity
cd fe
npm ci
cd ..
make deps
make test
cd fe && npm test
```

## CI Parity

Local environment must match CI exactly. CI configuration is canonical source.
Node.js version from vdp/fe/.nvmrc.
Go version from .github/workflows/vdp-ci.yml.
Docker images from docker-compose.yml.

Never hardcode versions in CI workflows. Use node-version-file vdp/fe/.nvmrc instead of node-version 20.

## Troubleshooting

Environment check fails in pre-commit:

```bash
./vdp/scripts/check-env-parity.sh
```

Follow instructions in error message. Common fixes are nvm use to switch Node.js version or npm install to regenerate package-lock.json.

CI passes but local tests fail or vice versa indicates environment divergence. Run full local CI gate:

```bash
cd vdp
make ci-pr
```

If this fails but CI passes or vice versa investigate by checking versions with node --version go version docker --version and checking cache by clearing node_modules ~/.npm ~/.cache/go-build and checking working directory for uncommitted changes in dependencies.

## Further Reading

See local-qg-deploy-secrets.md for running full CI checks locally.
See setup-github-deploy-secrets.md for CI/CD configuration.
