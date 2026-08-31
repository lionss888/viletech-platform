# Kubernetes delivery (этап 2)

Статус этапа: не начат. Предусловие для старта: зелёный Compose-CD на среде alpha (digest pin, smoke, проверенный rollback).

## Принцип

Принцип первый. Те же immutable digest из GHCR или из GitLab registry, а именно образа vdp-core, vdp-hub и vdp-fe.

Принцип второй. Без пересборки при promote alpha в gamma.

Принцип третий. Один Deployment на сервис, отдельно для core, hub и fe; Postgres — managed или отдельный StatefulSet.

Принцип четвёртый. Конфиг и секреты — через Secret или ExternalSecrets, не в образе.

## Шов с Compose-CD

Соответствие первое. В Compose (этап 1) это docker-compose.release.yml плюс env pin. В K8s (этап 2) это values Helm или Kustomize, где поле image закреплено по digest.

Соответствие второе. В Compose (этап 1) это deploy-compose-release.sh. В K8s (этап 2) это GitOps через Argo CD или Flux, либо kubectl set image.

Соответствие третье. В Compose (этап 1) это wait-release-health.sh. В K8s (этап 2) это readinessProbe плюс rollout status.

Соответствие четвёртое. В Compose (этап 1) это файл .release-images.env. В K8s (этап 2) это pin в values.yaml или OCI artifact.

## Рекомендуемые шаги

Шаг 1. Namespace: vdp-alpha и vdp-gamma; network policies, чтобы Provider был без лишних egress.

Шаг 2. Manifests из pin-файла CI: генератор job в vdp-images, затем commit в deploy repo или OCI bundle.

Шаг 3. Ingress с TLS; core и hub — internal; fe — public.

Шаг 4. Observability: semantic alerts из semantic-alerts.md; correlation id и form id в логах.

Шаг 5. Canary: одна реплика нового digest плюс smoke перед full rollout, см. тесты-архитектуры.

Шаг 6. GitLab: CI остаётся без deploy; mirror и registry copy без изменений.

## Вне scope до закрытия Compose-CD

Вне scope первое. Service mesh, multi-cluster, автоматический выкат в gamma без approval.

Вне scope второе. Перенос Postgres в operator без плана миграции данных.

## DoD этапа 2 (когда начнётся)

Критерий первый, не выполнен. K8s на alpha использует тот же digest, что и Compose-smoke на alpha.

Критерий второй, не выполнен. Промоут в gamma идёт через manual approve, а rollback равен предыдущему digest в GitOps.

Критерий третий, не выполнен. Runbooks stuck-payment и hub-failure применимы к логам K8s.
