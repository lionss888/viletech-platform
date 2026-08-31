# Kubernetes delivery (этап 2)

**Статус:** не начат. **Предусловие:** зелёный Compose-CD на staging (digest pin, smoke, rollback проверен).

## Принцип

- Те же **immutable digest** из GHCR / GitLab registry (`vdp-core`, `vdp-hub`, `vdp-fe`).
- **Без пересборки** при promote staging → prod.
- Один Deployment на сервис (core / hub / fe); Postgres — managed или StatefulSet отдельно.
- Конфиг и секреты — Secret/ExternalSecrets, не в образе.

## Шов с Compose-CD

| Compose (этап 1) | K8s (этап 2) |
|------------------|--------------|
| `docker-compose.release.yml` + env pin | Helm/Kustomize values `image: @digest` |
| `deploy-compose-release.sh` | GitOps (Argo CD / Flux) или `kubectl set image` |
| `wait-release-health.sh` | readinessProbe + rollout status |
| `.release-images.env` | values.yaml pin или OCI artifact |

## Рекомендуемые шаги

1. **Namespace** `vdp-staging` / `vdp-production`; network policies (Provider без лишних egress).
2. **Manifests** из pin-файла CI (генератор job в `vdp-images` → commit в deploy repo или OCI bundle).
3. **Ingress** TLS; core/hub internal; fe public.
4. **Observability:** semantic alerts из `semantic-alerts.md`; correlation id / form id в логах.
5. **Canary:** одна реплика нового digest + smoke перед full rollout (см. `тесты-архитектуры`).
6. **GitLab:** CI остаётся без deploy; mirror + registry copy без изменений.

## Вне scope до закрытия Compose-CD

- Service mesh, multi-cluster, auto-prod без approval.
- Перенос Postgres в operator без плана миграции данных.

## DoD этапа 2 (когда начнётся)

- [ ] Staging K8s = тот же digest, что Compose staging smoke
- [ ] Prod promote manual approve, rollback = previous digest in GitOps
- [ ] Runbooks stuck-payment / hub-failure применимы к K8s logs
