---
name: UX C2 Document view
overview: "Добавить действие «Посмотреть» рядом со «Скачать» в списке документов app-контура."
todos:
  - id: c2-ui
    content: DocumentViewer — Посмотреть via blob/iframe modal
    status: pending
  - id: c2-test
    content: Unit/helper test на preview fetch path
    status: pending
isProject: false
---

# C2 — «Посмотреть» у документов

## Rules
**Обязательны:** ui-web-практики, безопасность-ролей-и-данных (preview с auth), typescript-clean-code.
**Вне scope:** demo placeholder rewrite.

## Fix
`vdp/fe/src/components/ved/DocumentViewer.tsx` + `vdp/fe/src/lib/api/docs.ts`
- App + fileId: кнопки «Посмотреть» и «Скачать»
- Preview: auth fetch → blob URL → modal iframe (PDF)

## DoD
- [ ] Обе кнопки на строке документа
- [ ] PDF открывается в modal без утечки токена в query string страницы
---
