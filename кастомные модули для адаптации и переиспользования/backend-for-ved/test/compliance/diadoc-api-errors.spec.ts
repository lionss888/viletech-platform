/**
 * VF-2: Tests for Diadoc API Specific Errors Compliance
 * Based on: https://developer.kontur.ru/docs/diadoc-api/index.html
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { throwError } from 'rxjs';
import { AxiosError } from 'axios';

describe('Diadoc API Errors Compliance', () => {
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
          maxRetries: 0, // Disable retries for error tests
          requestTimeout: 1000,
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

  const createError = (status: number, message: string): AxiosError => {
    const error = new Error(message) as AxiosError;
    error.isAxiosError = true;
    error.response = {
      status,
      statusText: message,
      data: { message },
      headers: {},
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

  describe('HTTP Status Codes', () => {
    it('should handle 400 Bad Request', async () => {
      const error = createError(400, 'Bad Request');
      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should handle 401 Unauthorized', async () => {
      const error = createError(401, 'Unauthorized');
      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should handle 403 Forbidden', async () => {
      const error = createError(403, 'Forbidden');
      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should handle 404 Not Found', async () => {
      const error = createError(404, 'Document not found');
      mockHttpService.get.mockReturnValueOnce(throwError(() => error));

      await expect(service.getDocumentStatus('test-id')).rejects.toThrow();
    });

    it('should handle 429 Too Many Requests', async () => {
      const error = createError(429, 'Too Many Requests');
      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should handle 500 Internal Server Error', async () => {
      const error = createError(500, 'Internal Server Error');
      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should handle 502 Bad Gateway', async () => {
      const error = createError(502, 'Bad Gateway');
      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should handle 503 Service Unavailable', async () => {
      const error = createError(503, 'Service Unavailable');
      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });
  });

  describe('Error Classification', () => {
    it('should classify 4xx errors as non-retryable (except 429)', async () => {
      const error400 = createError(400, 'Bad Request');
      mockHttpService.post.mockReturnValueOnce(throwError(() => error400));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();

      // Should not retry 400 errors
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it('should classify 5xx errors as retryable', async () => {
      const error500 = createError(500, 'Internal Server Error');
      const { of } = require('rxjs');
      const { AxiosResponse } = require('axios');

      // First attempt fails, second succeeds
      mockHttpService.post
        .mockReturnValueOnce(throwError(() => error500))
        .mockReturnValueOnce(
          of({
            data: { MessageId: 'test-id' },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: {},
          }),
        );

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('test-id');
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });
  });
});
