/**
 * VF-2: Tests for Diadoc API Endpoints Compliance
 * Based on: https://developer.kontur.ru/docs/diadoc-api/index.html
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('Diadoc Endpoints Compliance', () => {
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

  describe('PostMessage Endpoint', () => {
    it('should use /V3/PostMessage for uploading documents', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/V3/PostMessage'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should use POST method for PostMessage', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(mockHttpService.post).toHaveBeenCalled();
      expect(mockHttpService.get).not.toHaveBeenCalled();
    });

    it('should include FromBoxId in request body', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const requestBody = callArgs[1];
      expect(requestBody).toHaveProperty('FromBoxId');
      expect(requestBody.FromBoxId).toBe('test-box-id');
    });

    it('should use application/json content type', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      expect(headers['Content-Type']).toContain('application/json');
    });
  });

  describe('SendMessage Endpoint', () => {
    it('should use /V3/SendMessage for sending to recipient', async () => {
      mockHttpService.post
        .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'upload-id' })))
        .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'send-id' })));

      const buffer = Buffer.from('test');
      const uploadResult = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      await service.sendForSigning(uploadResult.messageId, 'recipient-box-id', '1234567890');

      const sendCall = mockHttpService.post.mock.calls.find((call) =>
        call[0].includes('/V3/SendMessage'),
      );
      expect(sendCall).toBeDefined();
      expect(sendCall[0]).toContain('/V3/SendMessage');
    });

    it('should use POST method for SendMessage', async () => {
      mockHttpService.post
        .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'upload-id' })))
        .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'send-id' })));

      const buffer = Buffer.from('test');
      const uploadResult = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      await service.sendForSigning(uploadResult.messageId, 'recipient-box-id', '1234567890');

      const sendCall = mockHttpService.post.mock.calls.find((call) =>
        call[0].includes('/V3/SendMessage'),
      );
      expect(sendCall).toBeDefined();
    });

    it('should require BoxId in request body', async () => {
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

    it('should require MessageId in request body', async () => {
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

    it('should require ToBoxId in request body', async () => {
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

  describe('GetMessage Endpoint', () => {
    it('should use /V3/GetMessage for getting message status', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      await service.getDocumentStatus('test-message-id');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/V3/GetMessage'),
        expect.any(Object),
      );
    });

    it('should use GET method for GetMessage', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      await service.getDocumentStatus('test-message-id');

      expect(mockHttpService.get).toHaveBeenCalled();
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });

    it('should require boxId query parameter', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      await service.getDocumentStatus('test-message-id');

      const callArgs = mockHttpService.get.mock.calls[0];
      const config = callArgs[1];
      expect(config?.params).toHaveProperty('boxId');
      expect(config?.params.boxId).toBe('test-box-id');
    });

    it('should require messageId query parameter', async () => {
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

  describe('GetMessageContent Endpoint', () => {
    it('should use /V3/GetMessageContent for downloading content', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse(Buffer.from('content'))),
      );

      await service.getSignedDocument('test-message-id', 'test-entity-id');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/V3/GetMessageContent'),
        expect.any(Object),
      );
    });

    it('should use GET method for GetMessageContent', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse(Buffer.from('content'))),
      );

      await service.getSignedDocument('test-message-id', 'test-entity-id');

      expect(mockHttpService.get).toHaveBeenCalled();
    });

    it('should require boxId query parameter', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse(Buffer.from('content'))),
      );

      await service.getSignedDocument('test-message-id', 'test-entity-id');

      const callArgs = mockHttpService.get.mock.calls[0];
      const config = callArgs[1];
      expect(config?.params).toHaveProperty('boxId');
    });

    it('should return binary data (arraybuffer)', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse(Buffer.from('content'))),
      );

      await service.getSignedDocument('test-message-id', 'test-entity-id');

      const callArgs = mockHttpService.get.mock.calls[0];
      const config = callArgs[1];
      expect(config?.responseType).toBe('arraybuffer');
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
      });
    });

    it('should not use deprecated V2 endpoints', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[0]).not.toContain('/V2/');
    });

    it('should not use deprecated V1 endpoints', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      expect(callArgs[0]).not.toContain('/V1/');
    });
  });
});
