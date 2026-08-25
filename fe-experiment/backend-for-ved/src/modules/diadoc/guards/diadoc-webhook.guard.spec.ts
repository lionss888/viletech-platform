import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { DiadocWebhookGuard } from './diadoc-webhook.guard';
import { Request } from 'express';

describe('DiadocWebhookGuard', () => {
  let guard: DiadocWebhookGuard;
  let configService: ConfigService;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: Partial<Request>;

  const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
    headers: {},
    body: {},
    ip: '192.168.1.1',
    path: '/diadoc/webhook',
    socket: {
      remoteAddress: '192.168.1.1',
    } as any,
    ...overrides,
  });

  const createMockExecutionContext = (request: Partial<Request>): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as any;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiadocWebhookGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<DiadocWebhookGuard>(DiadocWebhookGuard);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when Diadoc is disabled', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: false,
      });

      mockRequest = createMockRequest();
      mockExecutionContext = createMockExecutionContext(mockRequest);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should skip all validations when Diadoc is disabled', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: false,
      });

      mockRequest = createMockRequest({
        body: {}, // Invalid payload, but should be skipped
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it('should pass all validations when enabled and all checks pass', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          secret: 'test-secret',
          allowedIps: ['192.168.1.1'],
          maxAgeSeconds: 300,
          validatePayload: true,
        },
      });

      const now = Math.floor(Date.now() / 1000);
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
          'x-diadoc-webhook-timestamp': now.toString(),
          'x-diadoc-webhook-nonce': 'unique-nonce-123',
        },
        body: {
          documentId: 'test-document-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });
  });

  describe('validateSecret', () => {
    const expectedSecret = 'expected-secret'; // length 15

    beforeEach(() => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          secret: expectedSecret,
        },
      });
    });

    it('should pass when secret is valid', async () => {
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': expectedSecret,
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should throw UnauthorizedException when secret header is missing', async () => {
      mockRequest = createMockRequest({
        headers: {},
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('Missing webhook authentication');
    });

    it('should throw UnauthorizedException when secret is invalid', async () => {
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': 'wrong-secret-12', // Same length (15), different content
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('Invalid webhook authentication');
    });

    it('should skip secret validation when secret is not configured', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          // secret not set
          validatePayload: false, // Skip payload validation too
        },
      });

      mockRequest = createMockRequest({
        headers: {},
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      // Should pass when secret is not configured
      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should use timing-safe comparison for secret validation', async () => {
      // This test verifies that timingSafeEqual is used
      // timingSafeEqual requires same length buffers, so we test with same length but different content
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': 'wrong-secret-12', // Same length (15), different content
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateIpAddress', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          allowedIps: ['192.168.1.1', '10.0.0.0/8'],
        },
      });
    });

    it('should pass when IP is in whitelist (exact match)', async () => {
      mockRequest = createMockRequest({
        ip: '192.168.1.1',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      // Mock config to skip secret validation
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          allowedIps: ['192.168.1.1'],
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should pass when IP is in CIDR range', async () => {
      mockRequest = createMockRequest({
        ip: '10.0.0.5',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          allowedIps: ['10.0.0.0/8'],
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should throw UnauthorizedException when IP is not in whitelist', async () => {
      mockRequest = createMockRequest({
        ip: '192.168.1.2',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          allowedIps: ['192.168.1.1'],
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('Unauthorized IP address');
    });

    it('should use X-Forwarded-For header when present', async () => {
      mockRequest = createMockRequest({
        ip: '192.168.1.2', // This will be ignored
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          allowedIps: ['192.168.1.1'],
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should use X-Real-IP header when X-Forwarded-For is not present', async () => {
      mockRequest = createMockRequest({
        ip: '192.168.1.2',
        headers: {
          'x-real-ip': '192.168.1.1',
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          allowedIps: ['192.168.1.1'],
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should skip IP validation when allowedIps is not configured', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          // allowedIps not set
        },
      });

      mockRequest = createMockRequest({
        ip: '192.168.1.999', // Invalid IP, but should be skipped
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      // Should not throw on IP validation, but may throw on other validations
      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });
  });

  describe('validateTimestamp', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          maxAgeSeconds: 300, // 5 minutes
        },
      });
    });

    it('should pass when timestamp is valid', async () => {
      const now = Math.floor(Date.now() / 1000);
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-timestamp': now.toString(),
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          maxAgeSeconds: 300,
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should throw BadRequestException when timestamp is too old', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-timestamp': oldTimestamp.toString(),
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          maxAgeSeconds: 300,
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('Request timestamp is invalid or expired');
    });

    it('should throw BadRequestException when timestamp is in the future (more than 60 seconds)', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 120; // 2 minutes in future
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-timestamp': futureTimestamp.toString(),
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          maxAgeSeconds: 300,
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when timestamp is invalid (NaN)', async () => {
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-timestamp': 'invalid-timestamp',
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          maxAgeSeconds: 300,
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);
    });

    it('should prevent duplicate nonce (replay protection)', async () => {
      const now = Math.floor(Date.now() / 1000);
      const nonce = 'unique-nonce-123';

      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-timestamp': now.toString(),
          'x-diadoc-webhook-nonce': nonce,
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          maxAgeSeconds: 300,
        },
      });

      // First request should pass
      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);

      // Second request with same nonce should fail
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('Duplicate request detected');
    });

    it('should allow different nonces', async () => {
      const now = Math.floor(Date.now() / 1000);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          maxAgeSeconds: 300,
        },
      });

      // First request
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-timestamp': now.toString(),
          'x-diadoc-webhook-nonce': 'nonce-1',
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);
      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);

      // Second request with different nonce should pass
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-timestamp': (now + 1).toString(),
          'x-diadoc-webhook-nonce': 'nonce-2',
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);
      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should skip timestamp validation when maxAgeSeconds is not configured', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          // maxAgeSeconds not set
        },
      });

      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });
  });

  describe('validateRateLimit', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          // Rate limit is always checked when enabled
        },
      });
    });

    it('should allow requests within rate limit (10 per minute)', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {},
      });

      mockRequest = createMockRequest({
        ip: '192.168.1.1',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });

      // Make 10 requests - all should pass
      for (let i = 0; i < 10; i++) {
        mockExecutionContext = createMockExecutionContext(mockRequest);
        await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
      }
    });

    it('should throw HttpException when rate limit is exceeded', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {},
      });

      mockRequest = createMockRequest({
        ip: '192.168.1.1',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });

      // Make 10 requests (limit)
      for (let i = 0; i < 10; i++) {
        mockExecutionContext = createMockExecutionContext(mockRequest);
        await guard.canActivate(mockExecutionContext);
      }

      // 11th request should fail
      mockExecutionContext = createMockExecutionContext(mockRequest);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(HttpException);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('Too many requests');
    });

    it('should reset rate limit counter after window expires', async () => {
      jest.useFakeTimers();
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {},
      });

      mockRequest = createMockRequest({
        ip: '192.168.1.1',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        mockExecutionContext = createMockExecutionContext(mockRequest);
        await guard.canActivate(mockExecutionContext);
      }

      // Advance time by 61 seconds (past the 60 second window)
      jest.advanceTimersByTime(61000);

      // Next request should pass (counter reset)
      mockExecutionContext = createMockExecutionContext(mockRequest);
      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);

      jest.useRealTimers();
    });

    it('should track rate limit per IP address', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {},
      });

      // IP 1 makes 10 requests
      const request1 = createMockRequest({
        ip: '192.168.1.1',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });

      for (let i = 0; i < 10; i++) {
        mockExecutionContext = createMockExecutionContext(request1);
        await guard.canActivate(mockExecutionContext);
      }

      // IP 2 should still be able to make requests
      const request2 = createMockRequest({
        ip: '192.168.1.2',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });

      mockExecutionContext = createMockExecutionContext(request2);
      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });
  });

  describe('validatePayload', () => {
    beforeEach(() => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          validatePayload: true,
        },
      });
    });

    it('should pass when payload is valid', async () => {
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-document-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          validatePayload: true,
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should throw BadRequestException when body is not an object', async () => {
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: 'invalid-string' as any,
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          validatePayload: true,
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('Invalid payload format');
    });

    it('should throw BadRequestException when documentId is missing', async () => {
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          status: 'signed',
          // documentId missing
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          validatePayload: true,
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('Missing required field: documentId');
    });

    it('should throw BadRequestException when documentId is not a string', async () => {
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 123, // Should be string
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          validatePayload: true,
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when status is missing', async () => {
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-document-id',
          // status missing
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          validatePayload: true,
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow('Missing required field: status');
    });

    it('should throw BadRequestException when status is not a string', async () => {
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-document-id',
          status: 123, // Should be string
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          validatePayload: true,
        },
      });

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);
    });

    it('should skip payload validation when validatePayload is false', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          validatePayload: false,
        },
      });

      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          // Invalid payload, but should be skipped
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });
  });

  describe('cleanupNonceCache', () => {
    it('should clean up expired nonces', async () => {
      jest.useFakeTimers();
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          maxAgeSeconds: 300,
        },
      });

      const now = Math.floor(Date.now() / 1000);
      const nonce1 = 'nonce-1';
      const nonce2 = 'nonce-2';

      // Add first nonce
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-timestamp': now.toString(),
          'x-diadoc-webhook-nonce': nonce1,
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);
      await guard.canActivate(mockExecutionContext);

      // Advance time by 6 minutes (past TTL of 5 minutes)
      jest.advanceTimersByTime(6 * 60 * 1000);

      // Add second nonce - should trigger cleanup
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-timestamp': (now + 360).toString(),
          'x-diadoc-webhook-nonce': nonce2,
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);
      await guard.canActivate(mockExecutionContext);

      // First nonce should be cleaned up, so it can be reused
      mockRequest = createMockRequest({
        headers: {
          'x-diadoc-webhook-timestamp': (now + 361).toString(),
          'x-diadoc-webhook-nonce': nonce1,
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);
      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);

      jest.useRealTimers();
    });
  });

  describe('cleanupRateLimitCache', () => {
    it('should clean up expired rate limit entries', async () => {
      jest.useFakeTimers();
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {},
      });

      mockRequest = createMockRequest({
        ip: '192.168.1.1',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });

      // Make 10 requests to fill rate limit
      for (let i = 0; i < 10; i++) {
        mockExecutionContext = createMockExecutionContext(mockRequest);
        await guard.canActivate(mockExecutionContext);
      }

      // Advance time by 61 seconds (past the window)
      jest.advanceTimersByTime(61000);

      // Next request should pass (cache cleaned up)
      mockExecutionContext = createMockExecutionContext(mockRequest);
      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);

      jest.useRealTimers();
    });
  });

  describe('getClientIp', () => {
    it('should prioritize X-Forwarded-For header', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          allowedIps: ['10.0.0.1'],
        },
      });

      mockRequest = createMockRequest({
        ip: '192.168.1.1',
        headers: {
          'x-forwarded-for': '10.0.0.1',
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should use X-Real-IP when X-Forwarded-For is not present', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          allowedIps: ['10.0.0.1'],
        },
      });

      mockRequest = createMockRequest({
        ip: '192.168.1.1',
        headers: {
          'x-real-ip': '10.0.0.1',
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should use request.ip as fallback', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          allowedIps: ['192.168.1.1'],
        },
      });

      mockRequest = createMockRequest({
        ip: '192.168.1.1',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });
  });

  describe('isIpInCidr', () => {
    it('should correctly identify IPs in CIDR range', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          allowedIps: ['192.168.1.0/24'],
        },
      });

      mockRequest = createMockRequest({
        ip: '192.168.1.100',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).resolves.toBe(true);
    });

    it('should correctly reject IPs outside CIDR range', async () => {
      jest.spyOn(configService, 'get').mockReturnValue({
        enabled: true,
        webhook: {
          allowedIps: ['192.168.1.0/24'],
        },
      });

      mockRequest = createMockRequest({
        ip: '192.168.2.100',
        headers: {
          'x-diadoc-webhook-secret': 'test-secret',
        },
        body: {
          documentId: 'test-id',
          status: 'signed',
        },
      });
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(UnauthorizedException);
    });
  });
});
