import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * VF-2: Guard для аутентификации webhook запросов от Diadoc
 *
 * Обеспечивает следующие проверки безопасности:
 * 1. Rate limiting (10 запросов в минуту с одного IP)
 * 2. Проверка секретного ключа (заголовок X-Diadoc-Webhook-Secret)
 * 3. Проверка IP-адреса отправителя (whitelist)
 * 4. Replay protection (проверка timestamp)
 * 5. Валидация структуры payload
 *
 * @see https://developer.kontur.ru/doc/diadoc-api/
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */
@Injectable()
export class DiadocWebhookGuard implements CanActivate {
  private readonly logger = new Logger(DiadocWebhookGuard.name);

  // Кэш обработанных nonce для replay protection
  private readonly processedNonces = new Map<string, number>();
  private readonly nonceCacheTtl = 5 * 60 * 1000; // 5 минут
  private lastCleanup = Date.now();

  // Rate limiting: хранит количество запросов по IP
  private readonly rateLimitCache = new Map<string, { count: number; resetAt: number }>();
  private readonly rateLimitMax = 10; // максимум 10 запросов
  private readonly rateLimitWindowMs = 60 * 1000; // за 1 минуту

  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const diadocConfig = this.configService.get('diadoc');
    const webhookConfig = diadocConfig?.webhook;

    // Если Diadoc отключен, пропускаем все проверки
    if (!diadocConfig?.enabled) {
      this.logger.warn('Diadoc integration is disabled, webhook authentication skipped');
      return true;
    }

    // 1. Rate limiting - проверяем первым для защиты от DDoS
    this.validateRateLimit(request);

    // 2. Проверка секретного ключа
    if (webhookConfig?.secret) {
      this.validateSecret(request, webhookConfig.secret);
    } else {
      this.logger.warn('Webhook secret is not configured, security check skipped');
    }

    // 3. Проверка IP-адреса
    if (webhookConfig?.allowedIps?.length > 0) {
      this.validateIpAddress(request, webhookConfig.allowedIps);
    }

    // 4. Replay protection
    if (webhookConfig?.maxAgeSeconds > 0) {
      this.validateTimestamp(request, webhookConfig.maxAgeSeconds);
    }

    // 5. Валидация структуры payload
    if (webhookConfig?.validatePayload !== false) {
      this.validatePayload(request);
    }

    // Периодическая очистка кэша nonce и rate limit
    this.cleanupNonceCache();
    this.cleanupRateLimitCache();

    return true;
  }

  /**
   * Проверка секретного ключа в заголовке
   */
  private validateSecret(request: Request, expectedSecret: string): void {
    const providedSecret = request.headers['x-diadoc-webhook-secret'] as string;

    if (!providedSecret) {
      this.logger.warn('Webhook secret header missing', {
        ip: this.getClientIp(request),
        path: request.path,
      });
      throw new UnauthorizedException('Missing webhook authentication');
    }

    // Сравнение в постоянное время для защиты от timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(providedSecret),
      Buffer.from(expectedSecret),
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook secret', {
        ip: this.getClientIp(request),
        path: request.path,
      });
      throw new UnauthorizedException('Invalid webhook authentication');
    }
  }

  /**
   * Проверка IP-адреса отправителя по whitelist
   */
  private validateIpAddress(request: Request, allowedIps: string[]): void {
    const clientIp = this.getClientIp(request);

    // Поддержка CIDR нотации для подсетей
    const isAllowed = allowedIps.some(allowedIp => {
      if (allowedIp.includes('/')) {
        return this.isIpInCidr(clientIp, allowedIp);
      }
      return clientIp === allowedIp;
    });

    if (!isAllowed) {
      this.logger.warn('Webhook request from unauthorized IP', {
        clientIp,
        allowedIps,
        path: request.path,
      });
      throw new UnauthorizedException('Unauthorized IP address');
    }
  }

  /**
   * Replay protection - проверка timestamp и nonce
   */
  private validateTimestamp(request: Request, maxAgeSeconds: number): void {
    const timestampHeader = request.headers['x-diadoc-webhook-timestamp'] as string;
    const nonceHeader = request.headers['x-diadoc-webhook-nonce'] as string;

    // Проверяем timestamp
    if (timestampHeader) {
      const timestamp = parseInt(timestampHeader, 10);
      const now = Math.floor(Date.now() / 1000);
      const age = now - timestamp;

      if (isNaN(timestamp) || age > maxAgeSeconds || age < -60) {
        this.logger.warn('Webhook request with stale or invalid timestamp', {
          timestamp,
          now,
          age,
          maxAgeSeconds,
          ip: this.getClientIp(request),
        });
        throw new BadRequestException('Request timestamp is invalid or expired');
      }
    }

    // Проверяем nonce для предотвращения повторной обработки
    if (nonceHeader) {
      if (this.processedNonces.has(nonceHeader)) {
        this.logger.warn('Duplicate webhook nonce detected', {
          nonce: nonceHeader,
          ip: this.getClientIp(request),
        });
        throw new BadRequestException('Duplicate request detected');
      }

      // Сохраняем nonce с текущим временем
      this.processedNonces.set(nonceHeader, Date.now());
    }
  }

  /**
   * Валидация структуры payload
   */
  private validatePayload(request: Request): void {
    const body = request.body;

    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Invalid payload format');
    }

    // Проверяем обязательные поля
    if (!body.documentId || typeof body.documentId !== 'string') {
      this.logger.warn('Webhook payload missing required field: documentId', {
        ip: this.getClientIp(request),
        body: JSON.stringify(body).slice(0, 200),
      });
      throw new BadRequestException('Missing required field: documentId');
    }

    if (!body.status || typeof body.status !== 'string') {
      this.logger.warn('Webhook payload missing required field: status', {
        ip: this.getClientIp(request),
        body: JSON.stringify(body).slice(0, 200),
      });
      throw new BadRequestException('Missing required field: status');
    }
  }

  /**
   * Получение IP-адреса клиента с учётом прокси
   */
  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }

    return request.ip || request.socket?.remoteAddress || 'unknown';
  }

  /**
   * Проверка, находится ли IP в CIDR диапазоне
   */
  private isIpInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split('/');
    const mask = parseInt(bits, 10);

    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);

    const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const rangeNum = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
    const maskNum = ~((1 << (32 - mask)) - 1);

    return (ipNum & maskNum) === (rangeNum & maskNum);
  }

  /**
   * Очистка устаревших nonce из кэша
   */
  private cleanupNonceCache(): void {
    const now = Date.now();

    // Очищаем не чаще раза в минуту
    if (now - this.lastCleanup < 60000) {
      return;
    }

    this.lastCleanup = now;
    let removedCount = 0;

    for (const [nonce, timestamp] of this.processedNonces.entries()) {
      if (now - timestamp > this.nonceCacheTtl) {
        this.processedNonces.delete(nonce);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired nonces from cache`);
    }
  }

  /**
   * Rate limiting - проверка количества запросов с одного IP
   * Лимит: 10 запросов в минуту
   */
  private validateRateLimit(request: Request): void {
    const clientIp = this.getClientIp(request);
    const now = Date.now();

    const entry = this.rateLimitCache.get(clientIp);

    if (!entry || now >= entry.resetAt) {
      // Новый период - устанавливаем счётчик
      this.rateLimitCache.set(clientIp, {
        count: 1,
        resetAt: now + this.rateLimitWindowMs,
      });
      return;
    }

    // Увеличиваем счётчик
    entry.count++;

    if (entry.count > this.rateLimitMax) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      this.logger.warn('Rate limit exceeded for webhook', {
        clientIp,
        count: entry.count,
        limit: this.rateLimitMax,
        retryAfter,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * Очистка устаревших записей rate limit
   */
  private cleanupRateLimitCache(): void {
    const now = Date.now();

    for (const [ip, entry] of this.rateLimitCache.entries()) {
      if (now >= entry.resetAt) {
        this.rateLimitCache.delete(ip);
      }
    }
  }
}
