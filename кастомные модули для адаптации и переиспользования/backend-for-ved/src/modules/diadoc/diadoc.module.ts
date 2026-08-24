import { Module, forwardRef } from '@nestjs/common';
import { DiadocServiceModule } from './service/diadoc.service.module';
import { DiadocController } from './web/diadoc.controller';
import { FileModule } from '../file/file.module';
import { FormPaymentServiceModule } from '../form-payment/service/form-payment.service.module';
import { ContractServiceModule } from '../contract/service/contract.service.module';
import { DiadocWebhookGuard } from './guards/diadoc-webhook.guard';

/**
 * VF-2: Главный модуль интеграции с Diadoc для ЭДО
 *
 * Этот модуль обеспечивает интеграцию с API Диадока для электронного
 * документооборота (ЭДО). Позволяет отправлять документы на подписание,
 * отслеживать их статус и получать подписанные документы.
 *
 * ## Возможности
 *
 * - Аутентификация через DiadocAuth
 * - Загрузка и отправка документов (PostMessage V3)
 * - Получение статуса документов (GetMessage V6)
 * - Скачивание подписанных документов
 * - Поиск контрагентов по ИНН
 * - Обработка webhook-уведомлений
 * - Периодическая проверка статусов
 * - Метрики и мониторинг
 *
 * ## Использование
 *
 * Модуль экспортирует `DiadocServiceModule`, который можно использовать
 * в других модулях для доступа к сервису Diadoc.
 *
 * @example
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { DiadocModule } from '../diadoc/diadoc.module';
 *
 * @Module({
 *   imports: [DiadocModule],
 * })
 * export class MyModule {}
 * ```
 *
 * ## Конфигурация
 *
 * Модуль требует следующие переменные окружения:
 * - `DIADOC_ENABLED` - включение интеграции
 * - `DIADOC_API_URL` - URL API Diadoc
 * - `DIADOC_API_CLIENT_ID` - ключ разработчика
 * - `DIADOC_AUTH_TOKEN` - авторизационный токен (или DIADOC_LOGIN/PASSWORD)
 * - `DIADOC_BOX_ID` - ID ящика организации
 *
 * ## API Endpoints
 *
 * - `POST /diadoc/webhook` - webhook для событий от Diadoc
 * - `GET /diadoc/health` - проверка здоровья интеграции
 * - `GET /diadoc/metrics` - метрики интеграции
 * - `POST /diadoc/check-status` - принудительная проверка статуса
 *
 * @see {@link DiadocService} - основной сервис интеграции
 * @see {@link DiadocController} - HTTP контроллер
 * @see {@link DiadocWebhookProcessorService} - обработчик webhook
 * @see {@link DiadocStatusCheckerService} - периодическая проверка статусов
 *
 * @module DiadocModule
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
@Module({
  imports: [
    DiadocServiceModule,
    FileModule,
    forwardRef(() => FormPaymentServiceModule),
    ContractServiceModule,
  ],
  controllers: [DiadocController],
  providers: [
    // VF-2 FIX: Guard для аутентификации webhook запросов
    DiadocWebhookGuard,
  ],
  exports: [DiadocServiceModule],
})
export class DiadocModule {}
