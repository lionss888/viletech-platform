# VDP Frontend

UI для платформы VDP. Product documentation: [../docs/README.md](../docs/README.md). Quick start stack: [../docs/development/getting-started.md](../docs/development/getting-started.md).

## Контуры

App (/login, /dashboard, /forms) — JWT + REST через прокси /api → vdp/core.

Demo (/demo/*) — локальные моки в браузере. Не источник истины по статусам. Подробнее [../docs/architecture/app-vs-demo.md](../docs/architecture/app-vs-demo.md).

Оба контура используют VedAppShell и src/components/ved/pages/*.

## Development

```sh
cd vdp/fe
npm i
npm run dev
```

С бэкендом: cd vdp && make compose-up → UI http://localhost:5173, API http://localhost:8080.

Seed app: user@vdp.local / user (manager, ico, eco, provider, bank, root — пароль = local-part).

Demo-only: user@demo.vdp.local / DemoUser2024! и аналоги по ролям на /demo/login.

## FE-специфика

Lovable UX parity: shell h-screen, dropdown Создать, брендинг ВЭД от Вилетех.

App create: после POST /forms auto recognize_complete → draft (OCR не подключён).

Route-файлы только объявляют Route; страницы в src/components/ved/pages/*.

Lovable git constraints: см. AGENTS.md — не force-push pushed history.

## Тесты

Unit: npm test в vdp/fe.

Integration gate, parity RD, Playwright: [../docs/development/testing.md](../docs/development/testing.md).

## Copy layer

Role wording RW1–RW9: src/lib/ved/copy/*. Gate: copy-consistency.test.ts.
