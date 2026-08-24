/**
 * VF-2: Tests for Diadoc API Authorization Format Compliance
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

describe('Diadoc Authorization Format Compliance', () => {
  let service: DiadocService;
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
    httpService = module.get<HttpService>(HttpService);
    jest.clearAllMocks();
  });

  describe('Authorization Header Format', () => {
    it('should use DiadocAuth prefix in Authorization header', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      expect(headers?.Authorization).toMatch(/^DiadocAuth/);
    });

    it('should support format: DiadocAuth ddauth_api_client_id=...;ddauth_token=...', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      expect(headers?.Authorization).toMatch(
        /^DiadocAuth\s+ddauth_api_client_id=.+,ddauth_token=.+$/,
      );
    });

    it('should include apiClientId and token as required parameters', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      expect(headers?.Authorization).toContain('ddauth_api_client_id=test-api-client-id');
      expect(headers?.Authorization).toContain('ddauth_token=test-auth-token');
    });

    it('should have correct format with comma separator', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      const authHeader = headers?.Authorization;
      expect(authHeader).toMatch(/^DiadocAuth\s+ddauth_api_client_id=.+,ddauth_token=.+$/);
    });
  });

  describe('Authorization Error Handling', () => {
    it('should handle 401 Unauthorized for missing authorization', async () => {
      const error = new Error('Unauthorized') as AxiosError;
      error.isAxiosError = true;
      error.response = {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Unauthorized' },
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should handle 401 for invalid API key', async () => {
      const error = new Error('Invalid API key') as AxiosError;
      error.isAxiosError = true;
      error.response = {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Invalid API key' },
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should handle 401 for expired token', async () => {
      const error = new Error('Token expired') as AxiosError;
      error.isAxiosError = true;
      error.response = {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Token expired' },
        headers: {},
        config: {} as any,
      };

      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });
  });

  describe('Authorization Header Construction', () => {
    it('should construct header with apiClientId and token', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      const authHeader = headers?.Authorization;

      expect(authHeader).toBe('DiadocAuth ddauth_api_client_id=test-api-client-id,ddauth_token=test-auth-token');
    });

    it('should not include Bearer token format', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      const authHeader = headers?.Authorization;

      expect(authHeader).not.toContain('Bearer');
    });

    it('should not include Basic auth format', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      const authHeader = headers?.Authorization;

      expect(authHeader).not.toContain('Basic');
    });
  });

  describe('Authorization Requirements per Documentation', () => {
    it('should require Authorization header for all API calls', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      await service.getDocumentStatus('test-id');

      const postCall = mockHttpService.post.mock.calls[0];
      const getCall = mockHttpService.get.mock.calls[0];

      expect(postCall[2]?.headers).toHaveProperty('Authorization');
      expect(getCall[1]?.headers).toHaveProperty('Authorization');
    });

    it('should use DiadocAuth scheme per Diadoc API documentation', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      const authHeader = headers?.Authorization;

      expect(authHeader).toMatch(/^DiadocAuth\s+/);
    });

    it('should validate apiClientId and token are present', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      const authHeader = headers?.Authorization;

      expect(authHeader).toContain('ddauth_api_client_id=');
      expect(authHeader).toContain('ddauth_token=');
    });
  });
});
