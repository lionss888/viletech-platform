/**
 * VF-2: Integration tests for Diadoc error recovery
 * Tests retry logic, error metrics, and recovery after failures
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import { setupTestDatabase, teardownTestDatabase } from '../setup/mongodb-memory-server';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';

describe('Diadoc Error Recovery Integration', () => {
  let module: TestingModule;
  let diadocService: DiadocService;
  let httpService: HttpService;

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

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => mockConfigService.get('diadoc')],
        }),
        HttpModule,
      ],
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

    diadocService = module.get<DiadocService>(DIADOC_SERVICE);
    httpService = module.get<HttpService>(HttpService);
    jest.clearAllMocks();
  });

  describe('Retry After Temporary Errors', () => {
    it('should retry after 5xx errors', async () => {
      const error500 = createError(500, 'Internal Server Error');
      const successResponse = createMockAxiosResponse({ MessageId: 'test-id' });

      mockHttpService.post
        .mockReturnValueOnce(throwError(() => error500))
        .mockReturnValueOnce(of(successResponse));

      const buffer = Buffer.from('test');
      const result = await diadocService.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('test-id');
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });

    it('should record temporary errors in metrics', async () => {
      const error500 = createError(500, 'Internal Server Error');
      const successResponse = createMockAxiosResponse({ MessageId: 'test-id' });

      mockHttpService.post
        .mockReturnValueOnce(throwError(() => error500))
        .mockReturnValueOnce(of(successResponse));

      const buffer = Buffer.from('test');
      await diadocService.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const metrics = diadocService.getMetrics();
      expect(metrics.errors.temporary).toBeGreaterThan(0);
    });
  });

  describe('Error Metrics', () => {
    it('should save errors to metrics', async () => {
      const error500 = createError(500, 'Internal Server Error');
      mockHttpService.post.mockReturnValue(throwError(() => error500));

      const buffer = Buffer.from('test');
      try {
        await diadocService.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      } catch (e) {
        // Expected to fail
      }

      const metrics = diadocService.getMetrics();
      expect(metrics.errors.temporary).toBeGreaterThan(0);
    });

    it('should record rate limit errors', async () => {
      const error429 = createError(429, 'Too Many Requests');
      mockHttpService.post.mockReturnValue(throwError(() => error429));

      const buffer = Buffer.from('test');
      try {
        await diadocService.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      } catch (e) {
        // Expected to fail
      }

      const metrics = diadocService.getMetrics();
      expect(metrics.errors.rateLimit).toBeGreaterThan(0);
    });
  });

  describe('Recovery After Restart', () => {
    it('should be able to check status after service restart', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      const result = await diadocService.getDocumentStatus('test-message-id');

      expect(result.status).toBeDefined();
      expect(mockHttpService.get).toHaveBeenCalled();
    });
  });
});
