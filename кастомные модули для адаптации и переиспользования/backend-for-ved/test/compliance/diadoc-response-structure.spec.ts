/**
 * VF-2: Tests for Diadoc API Response Structure Compliance
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

describe('Diadoc Response Structure Compliance', () => {
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

  describe('PostMessage Response', () => {
    it('should contain MessageId in response', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'response-message-id' })),
      );

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('response-message-id');
    });

    it('should handle response with nested Message object', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(
          createMockAxiosResponse({
            Message: {
              MessageId: 'nested-message-id',
              FromBoxId: 'sender-box',
              ToBoxId: 'recipient-box',
            },
          }),
        ),
      );

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBeDefined();
    });

    it('should extract MessageId from various response structures', async () => {
      const responseVariants = [
        { MessageId: 'id-1' },
        { messageId: 'id-2' },
        { Message: { MessageId: 'id-3' } },
      ];

      for (const responseData of responseVariants) {
        mockHttpService.post.mockReturnValueOnce(
          of(createMockAxiosResponse(responseData)),
        );
        const buffer = Buffer.from('test');
        const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
        expect(result.messageId).toBeDefined();
      }
    });
  });

  describe('GetMessage Response', () => {
    it('should contain Status field', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'signed' })),
      );

      const result = await service.getDocumentStatus('test-message-id');

      expect(result.status).toBeDefined();
    });

    it('should handle Status in Message.Status', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Message: { Status: 'sent' } })),
      );

      const result = await service.getDocumentStatus('test-message-id');

      expect(result.status).toBeDefined();
    });

    it('should handle Status in Document.Status', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Document: { Status: 'rejected' } })),
      );

      const result = await service.getDocumentStatus('test-message-id');

      expect(result.status).toBeDefined();
    });

    it('should extract status from various response structures', async () => {
      const responseVariants = [
        { Status: 'signed' },
        { status: 'signed' },
        { Message: { Status: 'signed' } },
        { Document: { Status: 'signed' } },
      ];

      for (const responseData of responseVariants) {
        mockHttpService.get.mockReturnValueOnce(
          of(createMockAxiosResponse(responseData)),
        );
        const result = await service.getDocumentStatus('test-id');
        expect(result.status).toBeDefined();
      }
    });
  });

  describe('GetMessageContent Response', () => {
    it('should return binary data for document content', async () => {
      const content = Buffer.from('document content');
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse(content)));

      const result = await service.getSignedDocument('test-message-id', 'test-entity-id');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle arraybuffer response type', async () => {
      const content = Buffer.from('document content');
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse(content)));

      await service.getSignedDocument('test-message-id', 'test-entity-id');

      const callArgs = mockHttpService.get.mock.calls[0];
      expect(callArgs[1]?.responseType).toBe('arraybuffer');
    });
  });
});
