/**
 * VF-2: Константы модуля Diadoc
 *
 * Содержит токены для Dependency Injection и другие константы модуля.
 *
 * @example
 * ```typescript
 * import { Inject } from '@nestjs/common';
 * import { DIADOC_SERVICE } from './diadoc.constants';
 * import { IDiadocService } from './service/diadoc.service.interface';
 *
 * @Injectable()
 * class MyService {
 *   constructor(
 *     @Inject(DIADOC_SERVICE) private readonly diadocService: IDiadocService,
 *   ) {}
 * }
 * ```
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */

/**
 * Токен для инъекции сервиса Diadoc
 *
 * @constant
 * @type {string}
 *
 * @example
 * ```typescript
 * @Inject(DIADOC_SERVICE) private readonly diadocService: IDiadocService
 * ```
 */
export const DIADOC_SERVICE = 'IDiadocService';

/**
 * Токен для инъекции сервиса метрик Diadoc
 *
 * @constant
 * @type {string}
 */
export const DIADOC_METRICS_SERVICE = 'IDiadocMetricsService';

/**
 * Токен для инъекции обработчика ошибок Diadoc
 *
 * @constant
 * @type {string}
 */
export const DIADOC_ERROR_HANDLER = 'DiadocErrorHandler';

/**
 * Максимальный размер файла для загрузки в Diadoc (50 MB)
 *
 * @constant
 * @type {number}
 */
export const DIADOC_MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Таймаут запроса по умолчанию (60 секунд)
 *
 * @constant
 * @type {number}
 */
export const DIADOC_DEFAULT_TIMEOUT = 60000;

/**
 * Максимальное количество повторных попыток по умолчанию
 *
 * @constant
 * @type {number}
 */
export const DIADOC_DEFAULT_MAX_RETRIES = 3;

/**
 * Интервал проверки статусов по умолчанию (5 минут в cron формате)
 *
 * @constant
 * @type {string}
 */
export const DIADOC_DEFAULT_STATUS_CHECK_INTERVAL = '*/5 * * * *';

/**
 * TTL кэша BoxId по ИНН (1 час)
 *
 * @constant
 * @type {number}
 */
export const DIADOC_BOX_ID_CACHE_TTL = 3600000;

/**
 * TTL кэша статусов (2 минуты)
 *
 * @constant
 * @type {number}
 */
export const DIADOC_STATUS_CACHE_TTL = 120000;
