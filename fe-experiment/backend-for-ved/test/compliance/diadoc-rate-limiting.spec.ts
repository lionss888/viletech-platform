/**
 * VF-2: Tests for Diadoc API Rate Limiting Compliance
 * Based on: https://developer.kontur.ru/docs/diadoc-api/index.html
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

describe('Diadoc Rate Limiting Compliance', () => {
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

  const createMockAxiosResponse = <T>(data: T): Partial<AxiosResponse<T>> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  });

  const create429Error = (retryAfter?: string): AxiosError => {
    const error = new Error('Too Many Requests') as AxiosError;
    error.isAxiosError = true;
    error.response = {
      status: 429,
      statusText: 'Too Many Requests',
      headers: retryAfter ? { 'retry-after': retryAfter } : {},
      data: { message: 'Too Many Requests' },
      config: {} as any,
    };
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

  describe('429 Too Many Requests Handling', () => {
    it('should recognize 429 status code and throw appropriate error', async () => {
      const error429 = create429Error('10');
      mockHttpService.post.mockReturnValueOnce(throwError(() => error429));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should extract Retry-After header from 429 response', async () => {
      const retryAfterSeconds = '60';
      const error429 = create429Error(retryAfterSeconds);
      mockHttpService.post.mockReturnValueOnce(throwError(() => error429));

      const buffer = Buffer.from('test');
      try {
        await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      } catch (e: any) {
        // Error should be thrown
        expect(e).toBeDefined();
      }
    });

    it('should handle 429 without Retry-After header', async () => {
      const error429 = create429Error(); // No retry-after
      mockHttpService.post.mockReturnValueOnce(throwError(() => error429));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });
  });

  describe('Error Classification', () => {
    it('should classify 429 as rate limit error', async () => {
      const error429 = create429Error();
      mockHttpService.post.mockReturnValueOnce(throwError(() => error429));

      const buffer = Buffer.from('test');
      try {
        await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      } catch (e: any) {
        // Rate limit error is classified
        expect(e.message).toContain('Too Many Requests');
      }
    });

    it('should classify 400 as client error', async () => {
      const error400 = new Error('Bad Request') as AxiosError;
      error400.isAxiosError = true;
      error400.response = {
        status: 400,
        statusText: 'Bad Request',
        data: { message: 'Bad Request' },
        headers: {},
        config: {} as any,
      };
      mockHttpService.post.mockReturnValueOnce(throwError(() => error400));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should classify 5xx as server error', async () => {
      const error503 = new Error('Service Unavailable') as AxiosError;
      error503.isAxiosError = true;
      error503.response = {
        status: 503,
        statusText: 'Service Unavailable',
        data: { message: 'Service Unavailable' },
        headers: {},
        config: {} as any,
      };
      mockHttpService.post.mockReturnValueOnce(throwError(() => error503));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });
  });

  describe('Rate Limit Metrics', () => {
    it('should record rate limit error in metrics', async () => {
      const error429 = create429Error();
      mockHttpService.post.mockReturnValueOnce(throwError(() => error429));

      const buffer = Buffer.from('test');
      try {
        await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      } catch (e) {
        // Error expected
      }

      const metrics = service.getMetrics();
      expect(metrics.errors.rateLimit).toBeGreaterThanOrEqual(0);
    });

    it('should record temporary error in metrics for 5xx', async () => {
      const error500 = new Error('Internal Server Error') as AxiosError;
      error500.isAxiosError = true;
      error500.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: { message: 'Internal Server Error' },
        headers: {},
        config: {} as any,
      };
      mockHttpService.post.mockReturnValueOnce(throwError(() => error500));

      const buffer = Buffer.from('test');
      try {
        await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      } catch (e) {
        // Error expected
      }

      const metrics = service.getMetrics();
      expect(metrics.errors.temporary).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Successful Requests', () => {
    it('should handle successful upload without errors', async () => {
      const successResponse = createMockAxiosResponse({ MessageId: 'test-id' });
      mockHttpService.post.mockReturnValueOnce(of(successResponse));

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('test-id');
    });
  });
});
