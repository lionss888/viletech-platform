---
name: UX C1 Create OCR copy
overview: "Шаг 5 «Проверка»: сообщить, что документы распознаются; подпись у «Создать заявку» про фон и помощника Вэди."
todos:
  - id: c1-copy
    content: Тексты на step===4 + caption у CTA в forms-new-page.tsx
    status: pending
  - id: c1-test
    content: Unit/smoke на наличие константы или render-проверка текста
    status: pending
isProject: false
---

# C1 — OCR copy на шаге «Проверка»

## Rules
**Обязательны:** ui-web-практики, ux-формы-навигация-онбординг, поддержка-и-обратная-связь, честность-готовности, машинное-обучение (OCR side-path).
**Вне scope:** подключение OCR vendor, реальный TG notify Вэди.

## Fix
Файл: `vdp/fe/src/components/ved/pages/forms-new-page.tsx`
- На `step === 4` при наличии документов — блок «Документы будут распознаны после создания».
- Под кнопкой «Создать заявку» — подпись: распознавание в фоне; при ошибке/сложностях помощник Вэди сообщит (in-app статус как носитель в MVP).

## DoD
- [ ] Тексты видны на шаге 5 при файлах
- [ ] Нет ложного обещания vendor OCR
---

# C2 placeholder link — see ux_c2_document_view.plan.md
