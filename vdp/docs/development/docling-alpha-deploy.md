# Alpha Docling OCR pilot — host steps

After Images build publishes new core hub extraction digests and Deploy alpha runs.

## Env on VM

In /opt/vdp/.env.deploy set EXTRACTION_PRIMARY equals docling, EXTRACTION_FALLBACK equals fixture, EXTRACTION_DOCLING_URL equals http://docling:5001, OCR_TIMEOUT_MS equals 180000, GATEWAY_TIMEOUT equals 180. Leave Yandex PRIMARY unset on this pilot. Optional DOCLING_IMAGE pin for quay.io/docling-project/docling-serve-cpu.

## Recreate

From /opt/vdp with .env.deploy and .release-images.env sourced: docker compose -f docker-compose.yml -f docker-compose.release.yml --profile prod up -d --no-build --scale fe=0 docling extraction hub core

## Verify

curl extraction health on the host loopback expects primary equals docling and docling_url_set true. Upload one invoice as seed user and confirm HITL shows engine_id equals docling or an honest partial with manual fill.

## SSH ops risk

Workstation SSH to alpha has historically failed with publickey denied. Prefer GitHub Deploy with a refreshed DEPLOY_SSH_KEY. Local DoD still closes without workstation SSH; alpha merge-ready needs the Deploy path or fixed SSH.
