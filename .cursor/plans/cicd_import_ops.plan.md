---
name: CI CD import ops
overview: "Path-filter ловит postpay/IMP surface; local proxy не молчит в gaps: расширить detect-pilot-matrix regex, docs caveat."
todos:
  - id: cicd-path-filter
    content: Расширить regex detect-pilot-matrix под IMP FE+domain files
    status: completed
  - id: cicd-docs-gaps
    content: known-gaps явный local VDP_API_PROXY_TARGET + partial CD VM
    status: completed
isProject: false
---

# CI/CD import ops

Path-filter ловит postpay/IMP surface; local proxy не молчит в gaps.

## Цель

Страховка поставки после импортных E2E + честный ops.

## Работы

### 1. Расширить regex detect-pilot-matrix

[`vdp-ci.yml`](../../.github/workflows/vdp-ci.yml) `detect-pilot-matrix`: добавить `RateCommissionPanel.tsx`, `manager-payment.ts`, `forms-rate-commission` / nest treasurer paths по факту файлов P2.

Текущий regex:
```yaml
'^(vdp/fe/e2e/|vdp/fe/src/lib/ved/actions\.ts|vdp/fe/src/components/ved/ActionPanel\.tsx|vdp/core/internal/domain/formpayment/|vdp/core/internal/service/(contract|form_payment_assign)\.go)'
```

Добавить:
- `vdp/fe/src/components/ved/RateCommissionPanel\.tsx`
- `vdp/fe/src/lib/ved/manager-payment\.ts`
- `vdp/fe/src/lib/api/forms-rate-commission`
- `vdp/core/internal/service/form_payment_nest\.go`
- `vdp/core/internal/transport/http/(imp[0-9]|nest_form_routes)`

### 2. known-gaps: local proxy caveat

[`known-gaps.md`](../../vdp/docs/pilot/known-gaps.md): явный local `VDP_API_PROXY_TARGET=http://localhost:8080`; partial CD VM без изменения bootstrap.

Секция FE ops caveat уже есть — дополнить текстом о local compose.

### 3. Не делать release-gate обязательным

Не делать `release-gate` обязательным на PR; не расширять PR Playwright до полной матрицы.

## DoD

- [ ] Path-filter покрывает IMP FE+domain
- [ ] Docs caveat proxy
- [ ] Workflow валиден

## Сверка с rules

**Обязательны:** `vdp-ci-local-gate`, `развертывание-и-доставка`, `честность-готовности`, `mgmt-tg-notify`.

**Вне scope:** release-gate как обязательный PR gate, полная матрица в PR smoke, ops bootstrap VM реализация.
