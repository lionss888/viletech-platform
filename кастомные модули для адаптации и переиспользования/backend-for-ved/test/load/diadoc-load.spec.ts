/**
 * VF-2: Load tests for Diadoc integration
 * Tests system behavior under high load
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('Diadoc Load Tests', () => {
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
          maxRetries: 0,
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

  describe('Concurrent Document Upload', () => {
    it('should handle multiple simultaneous document uploads', async () => {
      const documentCount = 10;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const uploads = [];
      for (let i = 0; i < documentCount; i++) {
        uploads.push(
          service.uploadDocument(
            Buffer.from(`test-${i}`),
            `test-${i}.pdf`,
            'application/pdf',
          ),
        );
      }

      const results = await Promise.all(uploads);

      expect(results.length).toBe(documentCount);
      results.forEach((result) => {
        expect(result.messageId).toBeDefined();
      });
      expect(mockHttpService.post).toHaveBeenCalledTimes(documentCount);
    });

    it('should maintain service stability under concurrent load', async () => {
      const concurrentRequests = 20;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const startTime = Date.now();
      const uploads = [];
      for (let i = 0; i < concurrentRequests; i++) {
        uploads.push(
          service.uploadDocument(
            Buffer.from(`test-${i}`),
            `test-${i}.pdf`,
            'application/pdf',
          ),
        );
      }

      await Promise.all(uploads);
      const elapsedTime = Date.now() - startTime;

      expect(elapsedTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(mockHttpService.post).toHaveBeenCalledTimes(concurrentRequests);
    });
  });

  describe('Concurrent Status Checks', () => {
    it('should handle concurrent status checks', async () => {
      const checkCount = 10;
      mockHttpService.get.mockReturnValue(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      const checks = [];
      for (let i = 0; i < checkCount; i++) {
        checks.push(service.getDocumentStatus(`test-msg-${i}`));
      }

      const results = await Promise.all(checks);

      expect(results.length).toBe(checkCount);
      results.forEach((result) => {
        expect(result.status).toBeDefined();
      });
      expect(mockHttpService.get).toHaveBeenCalledTimes(checkCount);
    });
  });

  describe('Memory Stability', () => {
    it('should not have memory leaks during multiple operations', async () => {
      const iterations = 50;
      mockHttpService.post.mockReturnValue(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < iterations; i++) {
        await service.uploadDocument(
          Buffer.from(`test-${i}`),
          `test-${i}.pdf`,
          'application/pdf',
        );
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (less than 50MB for 50 operations)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Rate Limiting Handling', () => {
    it('should handle rate limit errors with retry', async () => {
      const { throwError } = require('rxjs');
      const error = new Error('Too Many Requests') as any;
      error.isAxiosError = true;
      error.response = {
        status: 429,
        headers: { 'retry-after': '1' },
        data: {},
        statusText: 'Too Many Requests',
        config: {},
      };

      const successResponse = createMockAxiosResponse({ MessageId: 'test-id' });

      mockHttpService.post
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(of(successResponse));

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('test-id');
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });
  });
});
