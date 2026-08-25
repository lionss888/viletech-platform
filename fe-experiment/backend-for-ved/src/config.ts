import * as _ from 'lodash';
import { stringToBoolean } from 'lib/utils/helpers/transform.helper';
import { BullRootModuleOptions } from '@nestjs/bull';
import * as process from 'process';

export const GUARD_SERVICE = 'GUARD_SERVICE';

export const config = () => ({
  serviceName: 'fea360',
  version: '1.0',
  port: process.env.PORT || process.env.PORT_AUTH || 30000,
  baseUrl: process.env.BASE_URL || 'localhost:30000',
  mongodb: { url: process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/fea360' },
  socket: {
    logs: {
      enabled: stringToBoolean(process.env.SOCKET_LOGS_ENABLED ?? 'false') === true,
    },
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  bullQueue: {
    redis: {
      host: process.env.REDIS_QUEUE_HOST || 'localhost',
      port: _.toNumber(process.env.REDIS_QUEUE_PORT) || 6379,
      password: process.env.REDIS_QUEUE_PASSWORD,
      username: process.env.REDIS_QUEUE_USERNAME,
      maxRetriesPerRequest: null,
      tls: stringToBoolean(process.env.REDIS_QUEUE_USE_TLS || 'false')
        ? {
            host: process.env.REDIS_QUEUE_HOST || 'localhost',
            port: _.toNumber(process.env.REDIS_QUEUE_PORT) || 6379,
          }
        : undefined,
    },
    defaultJobOptions: { backoff: { delay: 10000, type: 'fixed' }, removeOnComplete: true, attempts: 10 ** 9 },
  } as BullRootModuleOptions,
  initAdmin: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
  defaultParentEmails: process.env.DEFAULT_PARENT_EMAIL?.split(',') || [],
  staticSalt: { otp: process.env.STATIC_OTP_SALT || 'fUjXn2r5u7x!A%D*G-KaPdSgVkYp3s6v' },
  path: { uploads: process.env.UPLOAD_PATH || './uploads' },
  code: {
    staticSalt: process.env.STATIC_CODE_SALT || 'dRgUkXp2s5v8y/B?D(G+KbPeShVmYq3t',
    useStaticCode: stringToBoolean(process.env.USE_STATIC_CODE),
    staticCode: process.env.STATIC_CODE || '000000',
    registrationCodeExpiresMs: _.toNumber(process.env.Registration) || 3600000, // 1 час
  },
  currency: {
    base: 'usd',
    refreshOnStartup: stringToBoolean(process.env.CURRENCY_REFRESH_ON_STARTUP ?? 'true'),
    cron: {
      cbrInDev: stringToBoolean(process.env.CURRENCY_CRON_CBR_IN_DEV ?? 'false'),
      openExchangeInDev: stringToBoolean(process.env.CURRENCY_CRON_OPENEXCHANGE_IN_DEV ?? 'false'),
    },
    opex: {
      url: process.env.OPENEXCHANGE_URL || 'https://openexchangerates.org/api',
      appId: process.env.OPENEXCHANGE_APP_ID,
    },
    cbr: {
      url: process.env.CBR_URL || 'http://www.cbr.ru/DailyInfoWebServ/DailyInfo.asmx?WSDL',
    },
  },
  s3: {
    region: process.env.S3_REGION || 'eu-central-1',
    bucketName: process.env.BUCKET_NAME,
    endpoint: process.env.S3_ENDPOINT,
  },
  secretKey: process.env.SECRET_KEY || 'Y7oUOb9nOCMhmpJKkTTuLA0IEqmkjLzU', //todo file-store
  uploadFilePath: process.env.NODE_ENV === 'development' ? 'https://fea/file/preview/' : 'https://fea/file/preview', //todo
  staticPath:
    process.env.STATIC_PATH || `${process.env.BASE_URL || 'http://localhost:30000'}/api/1.0/file-store/static`,
  mailgun: {
    api_key: '',
    domain: '',
  },
  emails: {
    info: process.env.EMAIL_INFO || 'info@test.io',
    noreply: process.env.EMAIL_NOREPLAY || 'noreply@test.io',
  },
  tokens: {
    secret: process.env.SECRET || 'f154c49bfd796d52ca13c2484258bfef2a4e3e171624e92e9729c682ea10ca834edd440033ba42b5',
    accessToken: {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '30m',
    },
    refreshToken: {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    },
    connectionToken: {
      expiresIn: process.env.CONNECTION_TOKEN_EXPIRES_IN || '1m',
    },
  },
  crypto360: {
    auth: {
      login: process.env.AUTH_LOGIN,
      password: process.env.AUTH_PASSWORD,
      authUrl: process.env.AUTH_AUTH_URL,
      meUrl: process.env.AUTH_ME_URL,
    },
  },
  gotenberg: {
    html: (process.env.GOTENBERG_BASE_URL || 'http://localhost:3333') + '/forms/chromium',
  },
  smtp: {
    host: 'smtp.eu.mailgun.org',
    port: 2525,
    auth: {
      user: process.env.MAILGUN_EMAIL || 'info@test.io',
      pass: process.env.MAILGUN_PASSWORD || '9315251d',
    },
  },
  ocr: {
    authUrl: process.env.OCR_AUTH_URL || 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
    authToken: process.env.OCR_AUTH_TOKEN,
    baseApiUrl: process.env.OCR_BASE_API_URL || 'https://ocr.api.cloud.yandex.net/ocr/v1',
    folderId: process.env.OCR_FOLDER_ID,
  },
  recognize: {
    nodul: {
      isActive: stringToBoolean(process.env.NODUL_IS_ACTIVE) || false,
      url: process.env.NODUL_URL,
    },
    anthropic: {
      isActive: stringToBoolean(process.env.ANTHROPIC_IS_ACTIVE) || false,
    },
    chatgpt: {
      isActive: stringToBoolean(process.env.CHATGPT_IS_ACTIVE) || false,
    },
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    maxTokens: _.toNumber(process.env.OPENAI_MAX_TOKENS) || 8000,
    retries: {
      maxAttempts: _.toNumber(process.env.OPENAI_RETRY_MAX_ATTEMPTS) || 3,
      initialDelayMs: _.toNumber(process.env.OPENAI_RETRY_INITIAL_DELAY_MS) || 1000,
      maxDelayMs: _.toNumber(process.env.OPENAI_RETRY_MAX_DELAY_MS) || 30000,
      backoffMultiplier: _.toNumber(process.env.OPENAI_RETRY_BACKOFF_MULTIPLIER) || 2,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      rateLimit: {
        maxRetriesPerWindow: _.toNumber(process.env.OPENAI_RETRY_RATE_LIMIT_MAX) || 20,
        windowMs: _.toNumber(process.env.OPENAI_RETRY_RATE_LIMIT_WINDOW_MS) || 60000, // 1 минута по умолчанию
      },
    },
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN,
    channels: {
      manager: process.env.TELEGRAM_BOT_MANAGER_CHANNEL_ID,
      provider: process.env.TELEGRAM_BOT_PROVIDER_CHANNEL_ID,
      complianceOfficer: process.env.TELEGRAM_BOT_COMPLIANCE_OFFICER_CHANNEL_ID,
      lawyer: process.env.TELEGRAM_BOT_LAWYER_CHANNEL_ID,
      payments: process.env.TELEGRAM_BOT_PAYMENTS_CHANNEL_ID,
    },
  },
  defaultDBGlobalConfiguration: {
    openExchangeCorrectionPercent: 0.3,
    usdtCorrectionPercent: 1.4,
  },
  kontur: {
    apiKey: process.env.KONTUR_API_KEY,
    apiUrl: process.env.KONTUR_API_URL || 'https://focus-api.kontur.ru/api3',
    timeout: parseInt(process.env.KONTUR_TIMEOUT, 10) || 10000,
  },
  // VF-2: Интеграция с Диадоком для ЭДО
  // Документация: https://developer.kontur.ru/doc/diadoc-api
  diadoc: {
    enabled: stringToBoolean(process.env.DIADOC_ENABLED || 'false'),
    apiUrl: process.env.DIADOC_API_URL || 'https://diadoc-api.kontur.ru',
    // Ключ разработчика (ddauth_api_client_id) - GUID, уникальный идентификатор интегратора
    apiClientId: process.env.DIADOC_API_CLIENT_ID,
    // Авторизационный токен (ddauth_token) или логин/пароль для получения токена
    authToken: process.env.DIADOC_AUTH_TOKEN,
    // Логин для аутентификации (если токен не указан)
    login: process.env.DIADOC_LOGIN,
    // Пароль для аутентификации (если токен не указан)
    password: process.env.DIADOC_PASSWORD,
    // ID ящика организации (BoxId)
    boxId: process.env.DIADOC_BOX_ID,
    // Таймаут запросов в миллисекундах
    timeout: parseInt(process.env.DIADOC_TIMEOUT, 10) || 60000,
    // Интервал проверки статусов (cron формат)
    statusCheckInterval: process.env.DIADOC_STATUS_CHECK_INTERVAL || '*/5 * * * *',
    // Количество повторных попыток при временных ошибках
    maxRetries: parseInt(process.env.DIADOC_MAX_RETRIES, 10) || 3,
    // Deprecated: старый параметр apiKey (для обратной совместимости)
    apiKey: process.env.DIADOC_API_KEY,
    // VF-2 FIX: Настройки безопасности webhook
    webhook: {
      // Секретный ключ для проверки подлинности webhook запросов
      // Должен совпадать с ключом, указанным в настройках Diadoc
      secret: process.env.DIADOC_WEBHOOK_SECRET,
      // Разрешённые IP-адреса (whitelist) для webhook запросов
      // Если не указаны, проверка IP отключена
      allowedIps: process.env.DIADOC_WEBHOOK_ALLOWED_IPS?.split(',').map(ip => ip.trim()).filter(Boolean) || [],
      // Максимальный возраст запроса в секундах для replay protection
      // Запросы старше этого времени будут отклонены
      maxAgeSeconds: parseInt(process.env.DIADOC_WEBHOOK_MAX_AGE_SECONDS, 10) || 300, // 5 минут
      // Включить валидацию структуры payload
      validatePayload: stringToBoolean(process.env.DIADOC_WEBHOOK_VALIDATE_PAYLOAD || 'true'),
    },
  },
  features: {
    vm3Vm4: {
      enabled: stringToBoolean(process.env.VM3_VM4_FEATURE_ENABLED || 'true'),
    },
  },
  nats: {
    servers: [process.env.NATS_URL || 'nats://localhost:4222'],
  },
});
