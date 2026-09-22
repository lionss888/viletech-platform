/** Copy for create wizard review when documents are attached (OCR runs in parallel). */
export const CREATE_REVIEW_OCR_BANNER =
  "Документы распознаются в фоне. Применять отдельно не нужно — сумма и реквизиты подставятся сами, когда распознавание закончится. Проверьте поля ниже.";

/** Exported constant: CREATE_REVIEW_OCR_CAPTION. */
export const CREATE_REVIEW_OCR_CAPTION =
  "Распознавание не отправляет заявку менеджеру. Сохраните черновик или отправьте на проверку отдельно. Если произойдёт ошибка, помощник Вэди сообщит вам в кабинете.";

/** Exported constant: CREATE_REVIEW_OCR_PENDING. */
export const CREATE_REVIEW_OCR_PENDING =
  "Идёт распознавание документов… Можно продолжать заполнение формы. Применять не нужно — поля подставятся сами.";

/** Exported constant: CREATE_REVIEW_OCR_DONE (shown briefly when recognition finished). */
export const CREATE_REVIEW_OCR_DONE = "Готово — поля предзаполнены из распознавания.";

/** Shown when poll times out without ExtractionResult. */
export const CREATE_REVIEW_OCR_FAILED =
  "Не удалось распознать документ вовремя. Заполните сумму и реквизиты вручную — заявку можно сохранить.";

/** Extraction / Docling not reachable — do not pretend recognition is running. */
export const CREATE_REVIEW_OCR_UNAVAILABLE =
  "Распознавание временно недоступно. Заполните поля вручную или повторите позже.";

/** Fixture / fallback / empty degraded result. */
export const CREATE_REVIEW_OCR_DEGRADED =
  "Распознавание завершилось с ограничениями — проверьте поля вручную. Полные данные можно открыть в «Просмотр данных».";

/** Session died while polling. */
export const CREATE_REVIEW_OCR_AUTH_LOST =
  "Сессия истекла. Войдите снова, чтобы продолжить работу с заявкой.";
