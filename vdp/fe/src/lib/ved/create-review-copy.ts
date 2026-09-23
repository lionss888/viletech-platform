/** Copy for create wizard review when documents are attached and OCR is still pending. */
export const CREATE_REVIEW_OCR_BANNER =
  "Документы распознаются в фоне. Если удастся — доступные поля появятся в форме; иначе заполните сумму и реквизиты вручную. Проверьте поля ниже.";

/** Exported constant: CREATE_REVIEW_OCR_CAPTION. */
export const CREATE_REVIEW_OCR_CAPTION =
  "Распознавание не отправляет заявку менеджеру. Сохраните черновик или отправьте на проверку отдельно. Если произойдёт ошибка, помощник Вэди сообщит вам в кабинете.";

/** Exported constant: CREATE_REVIEW_OCR_PENDING. */
export const CREATE_REVIEW_OCR_PENDING =
  "Идёт распознавание документов… Можно продолжать заполнение формы. Доступные поля появятся, если распознавание их найдёт; иначе заполните вручную.";

/** Exported constant: CREATE_REVIEW_OCR_DONE (shown briefly when recognition finished with fields). */
export const CREATE_REVIEW_OCR_DONE =
  "Готово — доступные поля предзаполнены из распознавания. Проверьте их перед отправкой.";

/** Shown when poll times out without ExtractionResult. */
export const CREATE_REVIEW_OCR_FAILED =
  "Не удалось распознать документ вовремя. Заполните сумму и реквизиты вручную — заявку можно сохранить.";

/** Extraction / Docling not reachable — do not pretend recognition is running. */
export const CREATE_REVIEW_OCR_UNAVAILABLE =
  "Распознавание временно недоступно. Заполните поля вручную или повторите позже.";

/** Fixture / fallback / empty / low-confidence degraded result — never promise autofill. */
export const CREATE_REVIEW_OCR_DEGRADED =
  "Распознавание завершилось с ограничениями — на автоподстановку рассчитывать нельзя. Проверьте сумму и реквизиты вручную или откройте «Просмотр данных».";

/** Session died while polling. */
export const CREATE_REVIEW_OCR_AUTH_LOST =
  "Сессия истекла. Войдите снова, чтобы продолжить работу с заявкой.";
