---
name: VDP Prod Readiness Master
overview: "Мастер-план достижения prod-ready состояния VDP платформы: от текущих 88% пилота и 45% prod до полного production deployment. Последовательная реализация security → staging → ops → scope expansion."
todos:
  - id: phase1-docs-honesty
    content: "Фаза 1: Docs honesty sync (quick win) - поднять пилот до честных 90%"
    status: pending
  - id: phase2-security
    content: "Фаза 2: Security hardening - AuthZ audit + prod secrets + file ACL"
    status: pending
  - id: phase3-staging
    content: "Фаза 3: Staging readiness - vendor integrations + smoke tests"
    status: pending
  - id: phase4-ops
    content: "Фаза 4: Operational excellence - monitoring + alerts + runbooks"
    status: pending
  - id: phase5-export
    content: "Фаза 5: Export domain - state machine + API + tests"
    status: pending
  - id: phase6-export-ui
    content: "Фаза 6: Export UI/E2E - кабинеты + browser coverage"
    status: pending
  - id: phase7-refunds
    content: "Фаза 7: Refunds system - domain + UI + E2E"
    status: pending
  - id: phase8-logistics
    content: "Фаза 8: Logistics/shipment - полный контур"
    status: pending
  - id: milestone-prod
    content: "Milestone: Production go-live (95%+ готовности)"
    status: pending
  - id: milestone-full-scope
    content: "Milestone: Full scope вводных (100% requirements)"
    status: pending
isProject: false
---

# VDP Production Readiness Master Plan

## Текущее состояние и цели

**Сейчас:**
- Пилот (импорт): ~88% готовности  
- Production go-live: ~45% готовности
- Full scope вводных: ~65% готовности

**Цели:**
1. **Краткосрочно (2-4 недели)**: Production-ready импорт пилот (95%+ готовности)
2. **Среднесрочно (2-3 месяца)**: Полный scope вводных + operational excellence
3. **Долгосрочно**: Масштабируемая платформа с полным coverage

## Архитектура фаз

```mermaid
flowchart TD
    Current["Текущее состояние<br/>Импорт 88%<br/>Prod 45%"] 
    
    subgraph phase1 [Фаза 1: Quick Win]
        DocsSync["Docs Honesty Sync<br/>→ Пилот 90%"]
    end
    
    subgraph phase2 [Фаза 2: Security Critical]
        AuthZ["AuthZ Matrix Audit"]
        Secrets["Prod Secrets Setup"] 
        FileACL["File ACL Enforcement"]
    end
    
    subgraph phase3 [Фаза 3: Staging Ready]
        Vendor["Vendor Integrations"]
        Smoke["Staging Smoke Tests"]
        Deploy["Deploy Pipeline"]
    end
    
    subgraph phase4 [Фаза 4: Ops Excellence]
        Monitor["Monitoring Setup"]
        Alerts["Semantic Alerts"]
        Runbooks["Incident Runbooks"]
    end
    
    Milestone1["🎯 PRODUCTION READY<br/>Import Pilot 95%+"]
    
    subgraph phase5 [Фаза 5-8: Scope Expansion]
        Export["Export Domain + API"]
        ExportUI["Export UI + E2E"]
        Refunds["Refunds System"]
        Logistics["Logistics/Shipment"]
    end
    
    Milestone2["🎯 FULL SCOPE<br/>100% вводных"]
    
    Current --> phase1 --> phase2 --> phase3 --> phase4 --> Milestone1
    Milestone1 --> phase5 --> Milestone2
```

## Фазы исполнения

### Фаза 1: Documentation Honesty (1-2 дня)
**Цель:** Поднять честную оценку пилота с 88% до 90%
- Синхронизация docs с уже существующими `@pilot-matrix` specs
- Обновление `readiness-and-limits.md` и `known-gaps.md`  
- Закрытие stale todos в планах imp7/8/9

### Фаза 2: Security Hardening (1-2 недели)  
**Критический блокер для prod**
- AuthZ matrix audit всех endpoints (User/Manager/Provider/Treasurer/Root)
- Prod secrets: JWT_SECRET, HUB_SHARED_SECRET rotation
- File ACL: User видит только свои формы, Provider без ПДн
- Security sign-off checklist execution

### Фаза 3: Staging Readiness (1-2 недели)
**Реальные интеграции**  
- DOCS_URL, MAIL_URL, DIADOC_URL с real vendor endpoints
- `staging-smoke.sh` с live services
- Deploy pipeline hardening + rollback procedures

### Фаза 4: Operational Excellence (1-2 недели)
**Live monitoring**
- Deployed semantic alerts (stuck payments, compliance delays)
- Incident runbooks с real scenarios
- SLA calibration + on-call procedures

**Milestone 1: PRODUCTION READY** (95%+ для импорт пилота)

### Фаза 5: Export Domain (2-3 недели)
**Новый маршрут согласно вводных**
- State machine export + PAY_FROM_EXPORT treasurer
- API endpoints + AuthZ matrix expansion  
- Unit/HTTP tests export journeys

### Фаза 6: Export UI/E2E (2-3 недели)
- Export кабинеты (User/Manager/Treasurer/Provider)
- Browser E2E coverage export ladder
- Integration с pilot-matrix methodology

### Фаза 7: Refunds System (2-4 недели)  
**PAYMENT_REFUND_* из §4 вводных**
- Domain: state machine возврата ДС + инварианты
- API + Manager UI для инициирования возвратов
- E2E: full refund journey + edge cases

### Фаза 8: Logistics/Shipment (3-4 недели)
**SHIPMENT_* контур**
- Domain расширение + документооборот отгрузки
- UI логистических статусов + workflow
- Full E2E shipment ladder

**Milestone 2: FULL SCOPE** (100% требований вводных)

## Dependency Map

- **Фазы 1-4**: Последовательные (каждая зависит от предыдущей)
- **Фазы 5-8**: Могут идти параллельно после Milestone 1
- **Export** не зависит от Refunds/Logistics
- **Security/Staging** критичны для любого prod deployment

## Риски и митигация

**High Risk:**
- Security audit может выявить архитектурные проблемы → план B: временные mitigations
- Vendor integrations могут требовать изменений API → early prototyping

**Medium Risk:**  
- Export domain может конфликтовать с import patterns → design review
- E2E expansion может замедлить CI → selective coverage strategy

## Success Metrics

**Фаза 1-4 (Prod Ready):**
- Security checklist: 100% выполнено
- Staging smoke: все интеграции green  
- Monitoring: 0 alert gaps для money path
- Deploy: rollback tested + documented

**Фаза 5-8 (Full Scope):**
- Export: паритет с import coverage (domain → E2E)
- Refunds: state machine + UI + E2E journey  
- Logistics: full SHIPMENT_* workflow
- Overall: 100% requirements из `@вводные`

## Handover Criteria

**К заказчику (после Milestone 1):**
- `handover-secrets-checklist.md` закрыт
- Production environment bootstrapped
- On-call procedures transferred + documented
- Knowledge transfer sessions completed

Каждая фаза имеет детальный план с конкретными задачами, файлами и DoD критериями.