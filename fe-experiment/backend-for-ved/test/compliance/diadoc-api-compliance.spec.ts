/**
 * VF-2: Compliance tests for Diadoc API
 * Tests conformity with official Diadoc API documentation
 * https://developer.kontur.ru/docs/diadoc-api/index.html
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('Diadoc API Compliance Tests', () => {
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

  const createMockAxiosResponse = <T>(data: T, status = 200): Partial<AxiosResponse<T>> => ({
    data,
    status,
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

  describe('Authorization Format', () => {
    it('should use DiadocAuth format for Authorization header', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-message-id' })),
      );

      const buffer = Buffer.from('test content');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(mockHttpService.post).toHaveBeenCalled();
      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      expect(headers?.Authorization).toMatch(/^DiadocAuth/);
    });

    it('should include apiClientId and token in Authorization header', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-message-id' })),
      );

      const buffer = Buffer.from('test content');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      expect(headers?.Authorization).toContain('ddauth_api_client_id=test-api-client-id');
      expect(headers?.Authorization).toContain('ddauth_token=test-auth-token');
    });

    it('should follow Diadoc authorization header format', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-message-id' })),
      );

      const buffer = Buffer.from('test content');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      expect(headers?.Authorization).toMatch(
        /^DiadocAuth ddauth_api_client_id=.+,ddauth_token=.+$/,
      );
    });
  });

  describe('Endpoints Compliance', () => {
    it('should use /V3/PostMessage for uploading documents', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-message-id' })),
      );

      const buffer = Buffer.from('test content');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/V3/PostMessage'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should use /V3/SendMessage for sending documents for signing', async () => {
      mockHttpService.post
        .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'upload-id' })))
        .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'send-id' })));

      const buffer = Buffer.from('test content');
      const uploadResult = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      await service.sendForSigning(uploadResult.messageId, 'recipient-box-id', '1234567890');

      const sendCall = mockHttpService.post.mock.calls.find((call) =>
        call[0].includes('/V3/SendMessage'),
      );
      expect(sendCall).toBeDefined();
      expect(sendCall[0]).toContain('/V3/SendMessage');
    });

    it('should use /V3/GetMessage for getting document status', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      await service.getDocumentStatus('test-message-id');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/V3/GetMessage'),
        expect.any(Object),
      );
    });

    it('should use /V3/GetMessageContent for getting signed documents', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse(Buffer.from('pdf content'))),
      );

      await service.getSignedDocument('test-message-id', 'test-entity-id');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/V3/GetMessageContent'),
        expect.any(Object),
      );
    });

    it('should use V3 API version for all endpoints', async () => {
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

      expect(postCall[0]).toMatch(/\/V3\//);
      expect(getCall[0]).toMatch(/\/V3\//);
    });

    it('should use correct HTTP methods for endpoints', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      await service.getDocumentStatus('test-id');

      expect(mockHttpService.post).toHaveBeenCalled();
      expect(mockHttpService.get).toHaveBeenCalled();
    });
  });

  describe('Request Parameters Compliance', () => {
    describe('PostMessage request', () => {
      it('should include boxId in request body (FromBoxId)', async () => {
        mockHttpService.post.mockReturnValueOnce(
          of(createMockAxiosResponse({ MessageId: 'test-id' })),
        );

        const buffer = Buffer.from('test content');
        await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

        const callArgs = mockHttpService.post.mock.calls[0];
        const requestBody = callArgs[1];
        expect(requestBody).toHaveProperty('FromBoxId');
        expect(requestBody.FromBoxId).toBe('test-box-id');
      });

      it('should send file as base64 in DocumentAttachments', async () => {
        mockHttpService.post.mockReturnValueOnce(
          of(createMockAxiosResponse({ MessageId: 'test-id' })),
        );

        const buffer = Buffer.from('test content');
        await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

        const callArgs = mockHttpService.post.mock.calls[0];
        const requestBody = callArgs[1];
        expect(requestBody).toHaveProperty('DocumentAttachments');
        expect(requestBody.DocumentAttachments).toBeInstanceOf(Array);
        expect(requestBody.DocumentAttachments[0]).toHaveProperty('SignedContent');
        expect(requestBody.DocumentAttachments[0].SignedContent).toHaveProperty('Content');
      });
    });

    describe('SendMessage request', () => {
      it('should include BoxId in request body', async () => {
        mockHttpService.post
          .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'upload-id' })))
          .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'send-id' })));

        const buffer = Buffer.from('test');
        const uploadResult = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
        await service.sendForSigning(uploadResult.messageId, 'recipient-box-id', '1234567890');

        const sendCall = mockHttpService.post.mock.calls.find((call) =>
          call[0].includes('/V3/SendMessage'),
        );
        const requestBody = sendCall[1];
        expect(requestBody).toHaveProperty('BoxId');
      });

      it('should include MessageId in request body', async () => {
        mockHttpService.post
          .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'upload-id' })))
          .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'send-id' })));

        const buffer = Buffer.from('test');
        const uploadResult = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
        await service.sendForSigning(uploadResult.messageId, 'recipient-box-id', '1234567890');

        const sendCall = mockHttpService.post.mock.calls.find((call) =>
          call[0].includes('/V3/SendMessage'),
        );
        const requestBody = sendCall[1];
        expect(requestBody).toHaveProperty('MessageId');
      });

      it('should include ToBoxId in request body', async () => {
        mockHttpService.post
          .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'upload-id' })))
          .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'send-id' })));

        const buffer = Buffer.from('test');
        const uploadResult = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
        await service.sendForSigning(uploadResult.messageId, 'recipient-box-id', '1234567890');

        const sendCall = mockHttpService.post.mock.calls.find((call) =>
          call[0].includes('/V3/SendMessage'),
        );
        const requestBody = sendCall[1];
        expect(requestBody).toHaveProperty('ToBoxId');
        expect(requestBody.ToBoxId).toBe('recipient-box-id');
      });
    });

    describe('GetMessage request', () => {
      it('should include boxId as query parameter', async () => {
        mockHttpService.get.mockReturnValueOnce(
          of(createMockAxiosResponse({ Status: 'SIGNED' })),
        );

        await service.getDocumentStatus('test-message-id');

        const callArgs = mockHttpService.get.mock.calls[0];
        const config = callArgs[1];
        expect(config?.params).toHaveProperty('boxId');
        expect(config?.params.boxId).toBe('test-box-id');
      });

      it('should include messageId as query parameter', async () => {
        mockHttpService.get.mockReturnValueOnce(
          of(createMockAxiosResponse({ Status: 'SIGNED' })),
        );

        await service.getDocumentStatus('test-message-id');

        const callArgs = mockHttpService.get.mock.calls[0];
        const config = callArgs[1];
        expect(config?.params).toHaveProperty('messageId');
        expect(config?.params.messageId).toBe('test-message-id');
      });
    });

    describe('GetMessageContent request', () => {
      it('should include boxId as query parameter', async () => {
        mockHttpService.get.mockReturnValueOnce(
          of(createMockAxiosResponse(Buffer.from('content'))),
        );

        await service.getSignedDocument('test-message-id', 'test-entity-id');

        const callArgs = mockHttpService.get.mock.calls[0];
        const config = callArgs[1];
        expect(config?.params).toHaveProperty('boxId');
      });

      it('should use responseType arraybuffer for binary data', async () => {
        mockHttpService.get.mockReturnValueOnce(
          of(createMockAxiosResponse(Buffer.from('content'))),
        );

        await service.getSignedDocument('test-message-id', 'test-entity-id');

        const callArgs = mockHttpService.get.mock.calls[0];
        const config = callArgs[1];
        expect(config?.responseType).toBe('arraybuffer');
      });
    });
  });

  describe('Response Structure Compliance', () => {
    it('should handle PostMessage response with MessageId', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'response-message-id' })),
      );

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('response-message-id');
    });

    it('should handle GetMessage response with Status', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'signed' })),
      );

      const result = await service.getDocumentStatus('test-message-id');

      expect(result).toBeDefined();
    });

    it('should handle multiple status field locations', async () => {
      const responseVariants = [
        { Status: 'signed' },
        { Message: { Status: 'signed' } },
        { Document: { Status: 'signed' } },
      ];

      for (const responseData of responseVariants) {
        mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse(responseData)));
        const result = await service.getDocumentStatus('test-id');
        expect(result).toBeDefined();
      }
    });
  });

  describe('Error Handling Compliance', () => {
    it('should handle 400 Bad Request', async () => {
      const { AxiosError } = require('axios');
      const error = new Error('Bad Request') as any;
      error.isAxiosError = true;
      error.response = {
        status: 400,
        statusText: 'Bad Request',
        data: { message: 'Bad Request' },
        headers: {},
        config: {},
      };

      mockHttpService.post.mockReturnValueOnce(
        require('rxjs').throwError(() => error),
      );

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should handle 401 Unauthorized', async () => {
      const { AxiosError } = require('axios');
      const error = new Error('Unauthorized') as any;
      error.isAxiosError = true;
      error.response = {
        status: 401,
        statusText: 'Unauthorized',
        data: { message: 'Unauthorized' },
        headers: {},
        config: {},
      };

      mockHttpService.post.mockReturnValueOnce(
        require('rxjs').throwError(() => error),
      );

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should handle 429 Too Many Requests', async () => {
      const { AxiosError } = require('axios');
      const error = new Error('Too Many Requests') as any;
      error.isAxiosError = true;
      error.response = {
        status: 429,
        statusText: 'Too Many Requests',
        headers: { 'Retry-After': '60' },
        data: {},
        config: {},
      };

      mockHttpService.post.mockReturnValueOnce(
        require('rxjs').throwError(() => error),
      );

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });

    it('should handle 500 Internal Server Error', async () => {
      const { AxiosError } = require('axios');
      const error = new Error('Internal Server Error') as any;
      error.isAxiosError = true;
      error.response = {
        status: 500,
        statusText: 'Internal Server Error',
        data: {},
        headers: {},
        config: {},
      };

      mockHttpService.post.mockReturnValueOnce(
        require('rxjs').throwError(() => error),
      );

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
    });
  });

  describe('API Version Compliance', () => {
    it('should use V3 API version for all endpoints', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      await service.getDocumentStatus('test-id');

      const allCalls = [
        ...mockHttpService.post.mock.calls,
        ...mockHttpService.get.mock.calls,
      ];

      allCalls.forEach((call) => {
        expect(call[0]).toMatch(/\/V3\//);
        expect(call[0]).not.toMatch(/\/V2\//);
        expect(call[0]).not.toMatch(/\/V1\//);
      });
    });
  });
});
