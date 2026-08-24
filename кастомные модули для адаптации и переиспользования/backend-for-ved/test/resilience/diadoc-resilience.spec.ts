/**
 * VF-2: Resilience tests for Diadoc integration
 * Tests system behavior under failure conditions
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';

describe('Diadoc Resilience Tests', () => {
  let service: DiadocService;
  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'diadoc') {
        return {
          enabled: true,
          apiUrl: 'https://diadoc-api.kontur.ru',
          apiClientId: 'test-api-client-id',
          authToken: 'test-auth-token',
          boxId: 'test-box-id',
          maxRetries: 0, // Disable retries for faster tests
        };
      }
      return null;
    }),
  };

  const mockXmlGeneratorService = {
    generatePaymentOrderXml: jest.fn(),
    generateReportXml: jest.fn(),
    generateContractXml: jest.fn(),
  };

  const createError = (code: string, status?: number): AxiosError => {
    const error = new Error(code) as AxiosError;
    error.isAxiosError = true;
    error.code = code;
    if (status) {
      error.response = {
        status,
        statusText: 'Error',
        data: {},
        headers: {},
        config: {} as any,
      };
    }
    return error;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: DIADOC_SERVICE,
          useClass: DiadocService,
        },
        DiadocService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DiadocXmlGeneratorService,
          useValue: mockXmlGeneratorService,
        },
      ],
    }).compile();

    service = module.get<DiadocService>(DIADOC_SERVICE);
    jest.clearAllMocks();
  });

  describe('API Unavailability', () => {
    it('should handle ECONNREFUSED errors with retry', async () => {
      const error = createError('ECONNREFUSED');
      const successResponse = {
        data: { MessageId: 'test-id' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(of(successResponse));

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('test-id');
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });

    it('should record network errors in metrics', async () => {
      const error = createError('ECONNREFUSED');
      mockHttpService.post.mockReturnValue(throwError(() => error));

      const buffer = Buffer.from('test');
      try {
        await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      } catch (e) {
        // Expected to fail
      }

      const metrics = service.getMetrics();
      expect(metrics.errors.temporary).toBeGreaterThan(0);
    });
  });

  describe('Timeout Handling', () => {
    it('should retry on timeout errors', async () => {
      const timeoutError = createError('ETIMEDOUT');
      const successResponse = {
        data: { MessageId: 'test-id' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post
        .mockReturnValueOnce(throwError(() => timeoutError))
        .mockReturnValueOnce(of(successResponse));

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('test-id');
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });

    it('should record timeout errors in metrics', async () => {
      const timeoutError = createError('ETIMEDOUT');
      mockHttpService.post.mockReturnValue(throwError(() => timeoutError));

      const buffer = Buffer.from('test');
      try {
        await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      } catch (e) {
        // Expected to fail
      }

      const metrics = service.getMetrics();
      expect(metrics.errors.timeout).toBeGreaterThan(0);
    });
  });

  describe('Network Errors', () => {
    it('should handle ECONNRESET errors', async () => {
      const error = createError('ECONNRESET');
      const successResponse = {
        data: { MessageId: 'test-id' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      mockHttpService.post
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(of(successResponse));

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('test-id');
    });

    it('should handle DNS resolution failures', async () => {
      const error = createError('ENOTFOUND');
      mockHttpService.post.mockReturnValue(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });
  });

  describe('Partial Failures', () => {
    it('should handle individual document failures gracefully', async () => {
      const error = createError('ECONNREFUSED');
      const successResponse = {
        data: { MessageId: 'test-id' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // First document fails, second succeeds
      mockHttpService.post
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(of(successResponse));

      const buffer = Buffer.from('test');
      try {
        await service.uploadDocument(buffer, 'test1.pdf', 'application/pdf');
      } catch (e) {
        // Expected to fail
      }

      const result = await service.uploadDocument(buffer, 'test2.pdf', 'application/pdf');
      expect(result.messageId).toBe('test-id');
    });
  });

  describe('Recovery After Failures', () => {
    it('should recover after temporary API unavailability', async () => {
      const error = createError('ECONNREFUSED');
      const successResponse = {
        data: { MessageId: 'test-id' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
      };

      // Fail first, then succeed
      mockHttpService.post
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(of(successResponse));

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('test-id');
    });
  });
});
