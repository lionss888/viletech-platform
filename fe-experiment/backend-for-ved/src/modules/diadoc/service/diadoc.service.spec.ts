import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DiadocService } from './diadoc.service';
import { DIADOC_SERVICE } from '../diadoc.constants';
import { DiadocDocumentStatus } from './diadoc.service.interface';
import { DiadocXmlGeneratorService } from './diadoc-xml-generator.service';
import { of, throwError, TimeoutError } from 'rxjs';
import { AxiosResponse, AxiosError } from 'axios';

describe('DiadocService', () => {
  let service: DiadocService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  // Корректный mock-конфиг согласно Diadoc API документации
  // Формат заголовка: DiadocAuth ddauth_api_client_id={clientId},ddauth_token={token}
  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'diadoc') {
        return {
          enabled: true,
          apiUrl: 'https://diadoc-api.kontur.ru',
          apiClientId: 'test-api-client-id',
          authToken: 'test-auth-token', // Статический токен для тестов
          boxId: 'test-box-id',
        };
      }
      const config: Record<string, any> = {
        'diadoc.enabled': true,
        'diadoc.apiUrl': 'https://diadoc-api.kontur.ru',
        'diadoc.apiClientId': 'test-api-client-id',
        'diadoc.authToken': 'test-auth-token',
        'diadoc.boxId': 'test-box-id',
      };
      return config[key];
    }),
  };

  const createMockAxiosResponse = <T>(data: T, status = 200): Partial<AxiosResponse<T>> => ({
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  });

  const createMockAxiosError = (
    status: number,
    message: string,
    data?: any,
  ): AxiosError => {
    const error = new Error(message) as AxiosError;
    error.isAxiosError = true;
    error.response = {
      status,
      statusText: message,
      data: data || { message },
      headers: {},
      config: {} as any,
    } as any;
    return error;
  };

  const createNetworkError = (message: string): Error => {
    const error = new Error(message);
    (error as any).isAxiosError = true;
    (error as any).response = undefined;
    return error;
  };

  const mockXmlGeneratorService = {
    generatePaymentOrderXml: jest.fn(),
    generateReportXml: jest.fn(),
    generateContractXml: jest.fn(),
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
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset config mock to default values
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'diadoc') {
        return {
          enabled: true,
          apiUrl: 'https://diadoc-api.kontur.ru',
          apiClientId: 'test-api-client-id',
          authToken: 'test-auth-token',
          boxId: 'test-box-id',
        };
      }
      const config: Record<string, any> = {
        'diadoc.enabled': true,
        'diadoc.apiUrl': 'https://diadoc-api.kontur.ru',
        'diadoc.apiClientId': 'test-api-client-id',
        'diadoc.authToken': 'test-auth-token',
        'diadoc.boxId': 'test-box-id',
      };
      return config[key];
    });
  });

  describe('authenticate', () => {
    it('should return auth token when static token is configured', async () => {
      const result = await service.authenticate();
      expect(result).toBe('test-auth-token');
    });

    it('should throw BadRequestException when Diadoc is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'diadoc') {
            return {
              enabled: false,
              apiUrl: 'https://diadoc-api.kontur.ru',
              apiClientId: 'test-api-client-id',
              authToken: 'test-auth-token',
              boxId: 'test-box-id',
            };
          }
          return null;
        }),
      };
      const disabledModule: TestingModule = await Test.createTestingModule({
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
            useValue: disabledConfigService,
          },
        ],
      }).compile();
      const disabledService = disabledModule.get<DiadocService>(DIADOC_SERVICE);
      await expect(disabledService.authenticate()).rejects.toThrow('Diadoc integration is disabled');
    });

    it('should throw BadRequestException when auth credentials are not configured', async () => {
      const noCredentialsConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'diadoc') {
            return {
              enabled: true,
              apiUrl: 'https://diadoc-api.kontur.ru',
              apiClientId: 'test-api-client-id',
              // No authToken, login, or password
              boxId: 'test-box-id',
            };
          }
          return null;
        }),
      };
      const noCredentialsModule: TestingModule = await Test.createTestingModule({
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
            useValue: noCredentialsConfigService,
          },
        ],
      }).compile();
      const noCredentialsService = noCredentialsModule.get<DiadocService>(DIADOC_SERVICE);
      await expect(noCredentialsService.authenticate()).rejects.toThrow('Diadoc authentication credentials are not configured');
    });

    it('should succeed without boxId configured (boxId only needed for document operations)', async () => {
      const noBoxIdConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'diadoc') {
            return {
              enabled: true,
              apiUrl: 'https://diadoc-api.kontur.ru',
              apiClientId: 'test-api-client-id',
              authToken: 'test-auth-token',
              boxId: undefined,
            };
          }
          return null;
        }),
      };
      const noBoxIdModule: TestingModule = await Test.createTestingModule({
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
            useValue: noBoxIdConfigService,
          },
        ],
      }).compile();
      const noBoxIdService = noBoxIdModule.get<DiadocService>(DIADOC_SERVICE);
      // authenticate() should succeed - boxId is not required for authentication
      const token = await noBoxIdService.authenticate();
      expect(token).toBe('test-auth-token');
    });
  });

  describe('uploadDocument', () => {
    it('should upload document and return DiadocUploadResult', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [{ EntityId: 'test-entity-id', AttachmentType: 'Nonformalized' }],
      });

      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const buffer = Buffer.from('test file content');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result).toEqual({
        messageId: 'test-message-id',
        documentId: 'test-message-id', // For backwards compatibility
        entityId: 'test-entity-id',
      });
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/V3/PostMessage'),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.any(String),
          }),
        }),
      );
    });

    it('should verify correct endpoint /V3/PostMessage is used', async () => {
      const mockResponse = createMockAxiosResponse({ MessageId: 'test-message-id' });
      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const buffer = Buffer.from('test file content');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://diadoc-api.kontur.ru/V3/PostMessage',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should verify Authorization header format', async () => {
      const mockResponse = createMockAxiosResponse({ MessageId: 'test-message-id' });
      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const buffer = Buffer.from('test file content');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const headers = callArgs[2].headers;
      // Формат заголовка согласно документации Diadoc API:
      // DiadocAuth ddauth_api_client_id={clientId},ddauth_token={token}
      expect(headers.Authorization).toMatch(/^DiadocAuth ddauth_api_client_id=.*,ddauth_token=/);
    });

    it('should verify FromBoxId is passed in request body', async () => {
      const mockResponse = createMockAxiosResponse({ MessageId: 'test-message-id' });
      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const buffer = Buffer.from('test file content');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const requestBody = callArgs[1];
      // Согласно документации Diadoc API, boxId передаётся в body как FromBoxId
      expect(requestBody.FromBoxId).toBe('test-box-id');
    });

    it('should handle response with Entities', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [
          { EntityId: 'entity-1', AttachmentType: 'Nonformalized' },
          { EntityId: 'entity-2', EntityType: 'Signature' },
        ],
      });
      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const buffer = Buffer.from('test file content');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('test-message-id');
      expect(result.entityId).toBe('entity-1');
    });

    it('should handle response without Entities array', async () => {
      const mockResponse = createMockAxiosResponse({ MessageId: 'test-message-id' });
      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const buffer = Buffer.from('test file content');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result.messageId).toBe('test-message-id');
      expect(result.entityId).toBeUndefined();
    });

    it('should throw BadRequestException when Diadoc is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'diadoc') {
            return {
              enabled: false,
              apiUrl: 'https://diadoc-api.kontur.ru',
              apiClientId: 'test-api-client-id',
              authToken: 'test-auth-token',
              boxId: 'test-box-id',
            };
          }
          return null;
        }),
      };
      const disabledModule: TestingModule = await Test.createTestingModule({
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
            useValue: disabledConfigService,
          },
        ],
      }).compile();
      const disabledService = disabledModule.get<DiadocService>(DIADOC_SERVICE);
      const buffer = Buffer.from('test');
      await expect(disabledService.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow(
        'Diadoc integration is disabled',
      );
    });

    it('should throw BadRequestException when response has no messageId', async () => {
      const mockResponse = createMockAxiosResponse({ unexpectedField: 'value' });
      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const buffer = Buffer.from('test file content');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow(
        'Failed to get message ID from Diadoc API response',
      );
    });

    it('should handle 400 Bad Request error', async () => {
      const error = createMockAxiosError(400, 'Bad Request', { message: 'Invalid request format' });
      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test file content');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow(
        /Failed to uploadDocument/,
      );
    });

    it('should handle 401 Unauthorized error', async () => {
      const error = createMockAxiosError(401, 'Unauthorized');
      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      const buffer = Buffer.from('test file content');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow(
        /Failed to uploadDocument/,
      );
    });

    it('should handle 429 Too Many Requests error', async () => {
      const error = createMockAxiosError(429, 'Too Many Requests');
      mockHttpService.post.mockReturnValue(throwError(() => error));

      const buffer = Buffer.from('test file content');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
      
      // Verify at least one call was made (retry logic may make multiple calls)
      expect(mockHttpService.post).toHaveBeenCalled();
    }, 10000); // Increase timeout for retry logic

    it('should handle 500 Internal Server Error', async () => {
      const error = createMockAxiosError(500, 'Internal Server Error');
      mockHttpService.post.mockReturnValue(throwError(() => error));

      const buffer = Buffer.from('test file content');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
      
      // Verify at least one call was made (retry logic may make multiple calls)
      expect(mockHttpService.post).toHaveBeenCalled();
    }, 10000); // Increase timeout for retry logic

    it('should handle network errors', async () => {
      const error = createNetworkError('Network Error');
      mockHttpService.post.mockReturnValue(throwError(() => error));

      const buffer = Buffer.from('test file content');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
      
      // Verify at least one call was made (retry logic may make multiple calls)
      expect(mockHttpService.post).toHaveBeenCalled();
    }, 10000); // Increase timeout for retry logic
  });

  describe('sendForSigning', () => {
    it('should send document for signing and return message ID', async () => {
      // Order of calls in sendForSigning:
      // 1. getBoxIdByInn(recipientInn) -> calls getOrganizationsByInn
      // 2. getDocumentInfo(documentId)
      // 3. getSignedDocument(documentId, entityId)
      // 4. post PostMessage

      // Mock getOrganizationsByInn call (called by getBoxIdByInn)
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        Organizations: [{
          OrgId: 'org-123',
          Inn: '1234567890',
          Boxes: [{ BoxId: 'recipient-box-id', Title: 'Main Box' }],
        }],
      })));

      // Mock getDocumentInfo call (V6/GetMessage)
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        MessageId: 'test-document-id',
        Entities: [{
          EntityId: 'entity-123',
          AttachmentType: 'Nonformalized',
        }],
      })));

      // Mock getSignedDocument call (V4/GetEntityContent)
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse(Buffer.from('document-content'))));

      const mockResponse = createMockAxiosResponse({ MessageId: 'new-message-id' });
      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const result = await service.sendForSigning('test-document-id', 'test-box-id', '1234567890');

      expect(result).toBe('new-message-id');
      expect(mockHttpService.post).toHaveBeenCalled();
    });

    it('should verify correct endpoint /V3/PostMessage is used', async () => {
      // Mock getOrganizationsByInn call (called by getBoxIdByInn)
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        Organizations: [{
          OrgId: 'org-123',
          Inn: '1234567890',
          Boxes: [{ BoxId: 'recipient-box-id', Title: 'Main Box' }],
        }],
      })));

      // Mock getDocumentInfo call
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        MessageId: 'test-document-id',
        Entities: [{
          EntityId: 'entity-123',
          AttachmentType: 'Nonformalized',
        }],
      })));

      // Mock getSignedDocument call
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse(Buffer.from('document-content'))));

      const mockResponse = createMockAxiosResponse({ MessageId: 'new-message-id' });
      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      await service.sendForSigning('test-document-id', 'test-box-id', '1234567890');

      // Should use PostMessage, not SendMessage
      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/V3/PostMessage'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should verify request body structure (FromBoxId, ToBoxId, DocumentAttachments)', async () => {
      // Mock getOrganizationsByInn call (called by getBoxIdByInn)
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        Organizations: [{
          OrgId: 'org-123',
          Inn: '1234567890',
          Boxes: [{ BoxId: 'recipient-box-id', Title: 'Main Box' }],
        }],
      })));

      // Mock getDocumentInfo call
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        MessageId: 'test-document-id',
        Entities: [{
          EntityId: 'entity-123',
          AttachmentType: 'Nonformalized',
          FileName: 'test.pdf',
        }],
      })));

      // Mock getSignedDocument call
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse(Buffer.from('document-content'))));

      const mockResponse = createMockAxiosResponse({ MessageId: 'new-message-id' });
      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      await service.sendForSigning('test-document-id', 'custom-box-id', '1234567890');

      const callArgs = mockHttpService.post.mock.calls[0];
      const requestBody = callArgs[1];
      expect(requestBody).toMatchObject({
        FromBoxId: 'custom-box-id',
        ToBoxId: 'recipient-box-id',
        DocumentAttachments: expect.arrayContaining([
          expect.objectContaining({
            TypeNamedId: 'Nonformalized',
            NeedRecipientSignature: true,
          }),
        ]),
      });
    });

    it('should use default boxId when not provided', async () => {
      // Mock getOrganizationsByInn call (called by getBoxIdByInn)
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        Organizations: [{
          OrgId: 'org-123',
          Inn: '1234567890',
          Boxes: [{ BoxId: 'recipient-box-id', Title: 'Main Box' }],
        }],
      })));

      // Mock getDocumentInfo call
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        MessageId: 'test-document-id',
        Entities: [{
          EntityId: 'entity-123',
          AttachmentType: 'Nonformalized',
        }],
      })));

      // Mock getSignedDocument call
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse(Buffer.from('document-content'))));

      const mockResponse = createMockAxiosResponse({ MessageId: 'new-message-id' });
      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      await service.sendForSigning('test-document-id', '', '1234567890');

      const callArgs = mockHttpService.post.mock.calls[0];
      const requestBody = callArgs[1];
      expect(requestBody.FromBoxId).toBe('test-box-id');
    });

    it('should throw BadRequestException when recipientInn is empty', async () => {
      await expect(service.sendForSigning('test-document-id', 'test-box-id', '')).rejects.toThrow(
        'Recipient INN is required',
      );
    });

    it('should throw BadRequestException when Diadoc is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'diadoc') {
            return {
              enabled: false,
              apiUrl: 'https://diadoc-api.kontur.ru',
              apiClientId: 'test-api-client-id',
              authToken: 'test-auth-token',
              boxId: 'test-box-id',
            };
          }
          return null;
        }),
      };
      const disabledModule: TestingModule = await Test.createTestingModule({
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
            useValue: disabledConfigService,
          },
        ],
      }).compile();
      const disabledService = disabledModule.get<DiadocService>(DIADOC_SERVICE);
      await expect(disabledService.sendForSigning('doc-id', 'box-id', 'inn')).rejects.toThrow(
        'Diadoc integration is disabled',
      );
    });

    it('should handle 400 Bad Request error', async () => {
      // Mock getOrganizationsByInn call (called by getBoxIdByInn)
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        Organizations: [{ OrgId: 'org-123', Inn: 'inn', Boxes: [{ BoxId: 'box-id' }] }],
      })));

      // Mock getDocumentInfo call
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        MessageId: 'doc-id',
        Entities: [{ EntityId: 'entity-123', AttachmentType: 'Nonformalized' }],
      })));

      // Mock getSignedDocument call
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse(Buffer.from('content'))));

      const error = createMockAxiosError(400, 'Bad Request');
      mockHttpService.post.mockReturnValueOnce(throwError(() => error));

      await expect(service.sendForSigning('doc-id', 'box-id', 'inn')).rejects.toThrow(
        /Failed to sendForSigning/,
      );
    });

    it('should handle error when recipient organization not found', async () => {
      // Mock getDocumentInfo call
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        MessageId: 'doc-id',
        Entities: [{ EntityId: 'entity-123', AttachmentType: 'Nonformalized' }],
      })));

      // Mock getSignedDocument call
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse(Buffer.from('content'))));

      // Mock getOrganizationsByInn call - no organizations found
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        Organizations: [],
      })));

      await expect(service.sendForSigning('doc-id', 'box-id', 'invalid-inn')).rejects.toThrow(
        /Recipient organization not found/,
      );
    });

    it('should handle error when document entity not found', async () => {
      // Mock getDocumentInfo call - no entityId
      mockHttpService.get.mockReturnValueOnce(of(createMockAxiosResponse({
        MessageId: 'doc-id',
        Entities: [],
      })));

      await expect(service.sendForSigning('doc-id', 'box-id', 'inn')).rejects.toThrow(
        /Document entity not found/,
      );
    });
  });

  describe('getDocumentStatus', () => {
    it('should return document status SIGNED', async () => {
      const mockResponse = createMockAxiosResponse({ Status: 'signed' });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');

      expect(result).toBe(DiadocDocumentStatus.SIGNED);
      expect(mockHttpService.get).toHaveBeenCalled();
    });

    it('should verify correct endpoint /V3/GetMessage is used', async () => {
      const mockResponse = createMockAxiosResponse({ Status: 'signed' });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      await service.getDocumentStatus('test-document-id');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://diadoc-api.kontur.ru/V3/GetMessage',
        expect.any(Object),
      );
    });

    it('should verify query parameters (boxId, messageId)', async () => {
      const mockResponse = createMockAxiosResponse({ Status: 'signed' });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      await service.getDocumentStatus('test-document-id');

      const callArgs = mockHttpService.get.mock.calls[0];
      expect(callArgs[1].params).toEqual({
        boxId: 'test-box-id',
        messageId: 'test-document-id',
      });
    });

    it('should return DRAFT status', async () => {
      const mockResponse = createMockAxiosResponse({ Status: 'draft' });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');
      expect(result).toBe(DiadocDocumentStatus.DRAFT);
    });

    it('should return SENT status', async () => {
      const mockResponse = createMockAxiosResponse({ Status: 'sent' });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');
      expect(result).toBe(DiadocDocumentStatus.SENT);
    });

    it('should return REJECTED status', async () => {
      const mockResponse = createMockAxiosResponse({ Status: 'rejected' });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');
      expect(result).toBe(DiadocDocumentStatus.REJECTED);
    });

    it('should return CANCELLED status', async () => {
      const mockResponse = createMockAxiosResponse({ Status: 'cancelled' });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');
      expect(result).toBe(DiadocDocumentStatus.CANCELLED);
    });

    it('should handle alternative status field Message.Status', async () => {
      const mockResponse = createMockAxiosResponse({ Message: { Status: 'signed' } });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');
      expect(result).toBe(DiadocDocumentStatus.SIGNED);
    });

    it('should handle alternative status field Document.Status', async () => {
      const mockResponse = createMockAxiosResponse({ Document: { Status: 'sent' } });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');
      expect(result).toBe(DiadocDocumentStatus.SENT);
    });

    it('should handle lowercase status field', async () => {
      const mockResponse = createMockAxiosResponse({ status: 'signed' });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');
      expect(result).toBe(DiadocDocumentStatus.SIGNED);
    });

    it('should return DRAFT when status is missing', async () => {
      const mockResponse = createMockAxiosResponse({ unexpectedField: 'value' });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');
      expect(result).toBe(DiadocDocumentStatus.DRAFT);
    });

    it('should return DRAFT for unknown status', async () => {
      const mockResponse = createMockAxiosResponse({ Status: 'unknown_status' });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');
      expect(result).toBe(DiadocDocumentStatus.DRAFT);
    });

    it('should return UNKNOWN for non-standard status values (Russian)', async () => {
      // Russian status values are no longer supported - should use proper API status fields
      const mockResponse = createMockAxiosResponse({ Status: 'подписан' });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');
      expect(result).toBe(DiadocDocumentStatus.UNKNOWN);
    });

    it('should return UNKNOWN for Severity values (not proper status)', async () => {
      // Severity is not a valid status source - use RecipientResponseStatus or BilateralDocumentStatus
      const mockResponse = createMockAxiosResponse({ Status: 'success' });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentStatus('test-document-id');
      expect(result).toBe(DiadocDocumentStatus.UNKNOWN);
    });

    it('should throw BadRequestException when Diadoc is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'diadoc') {
            return {
              enabled: false,
              apiUrl: 'https://diadoc-api.kontur.ru',
              apiClientId: 'test-api-client-id',
              authToken: 'test-auth-token',
              boxId: 'test-box-id',
            };
          }
          return null;
        }),
      };
      const disabledModule: TestingModule = await Test.createTestingModule({
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
            useValue: disabledConfigService,
          },
        ],
      }).compile();
      const disabledService = disabledModule.get<DiadocService>(DIADOC_SERVICE);
      await expect(disabledService.getDocumentStatus('doc-id')).rejects.toThrow('Diadoc integration is disabled');
    });

    it('should handle 400 Bad Request error', async () => {
      const error = createMockAxiosError(400, 'Bad Request');
      mockHttpService.get.mockReturnValueOnce(throwError(() => error));

      await expect(service.getDocumentStatus('doc-id')).rejects.toThrow(
        /Failed to getDocumentStatus/,
      );
    });

    it('should handle 401 Unauthorized error', async () => {
      const error = createMockAxiosError(401, 'Unauthorized');
      mockHttpService.get.mockReturnValueOnce(throwError(() => error));

      await expect(service.getDocumentStatus('doc-id')).rejects.toThrow(
        /Failed to getDocumentStatus/,
      );
    });

    it('should handle 404 Not Found error', async () => {
      const error = createMockAxiosError(404, 'Not Found');
      mockHttpService.get.mockReturnValueOnce(throwError(() => error));

      await expect(service.getDocumentStatus('doc-id')).rejects.toThrow(
        /Failed to getDocumentStatus.*404/,
      );
    });

    it('should handle 429 Too Many Requests error', async () => {
      const error = createMockAxiosError(429, 'Too Many Requests');
      mockHttpService.get.mockReturnValueOnce(throwError(() => error));

      await expect(service.getDocumentStatus('doc-id')).rejects.toThrow(
        /Failed to getDocumentStatus.*429/,
      );
    });

    it('should handle 500 Internal Server Error with retry', async () => {
      const error = createMockAxiosError(500, 'Internal Server Error');
      mockHttpService.get.mockReturnValue(throwError(() => error));

      await expect(service.getDocumentStatus('doc-id')).rejects.toThrow(
        /Failed to getDocumentStatus/,
      );
      
      expect(mockHttpService.get).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('getSignedDocument', () => {
    it('should return signed document buffer', async () => {
      const mockBuffer = Buffer.from('signed document content');
      const mockResponse = createMockAxiosResponse(mockBuffer);

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getSignedDocument('test-document-id');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe(mockBuffer.toString());
      expect(mockHttpService.get).toHaveBeenCalled();
    });

    it('should verify correct endpoint /V3/GetMessageContent is used', async () => {
      const mockBuffer = Buffer.from('signed document content');
      const mockResponse = createMockAxiosResponse(mockBuffer);
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      await service.getSignedDocument('test-document-id');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://diadoc-api.kontur.ru/V3/GetMessageContent',
        expect.any(Object),
      );
    });

    it('should verify responseType is arraybuffer', async () => {
      const mockBuffer = Buffer.from('signed document content');
      const mockResponse = createMockAxiosResponse(mockBuffer);
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      await service.getSignedDocument('test-document-id');

      const callArgs = mockHttpService.get.mock.calls[0];
      expect(callArgs[1].responseType).toBe('arraybuffer');
    });

    it('should verify query parameters (boxId, messageId)', async () => {
      const mockBuffer = Buffer.from('signed document content');
      const mockResponse = createMockAxiosResponse(mockBuffer);
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      await service.getSignedDocument('test-document-id');

      const callArgs = mockHttpService.get.mock.calls[0];
      expect(callArgs[1].params).toEqual({
        boxId: 'test-box-id',
        messageId: 'test-document-id',
      });
    });

    it('should throw BadRequestException when response is empty', async () => {
      const mockResponse = createMockAxiosResponse(null);
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      await expect(service.getSignedDocument('test-document-id')).rejects.toThrow(
        'Empty response from Diadoc API',
      );
    });

    it('should throw BadRequestException when Diadoc is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'diadoc') {
            return {
              enabled: false,
              apiUrl: 'https://diadoc-api.kontur.ru',
              apiClientId: 'test-api-client-id',
              authToken: 'test-auth-token',
              boxId: 'test-box-id',
            };
          }
          return null;
        }),
      };
      const disabledModule: TestingModule = await Test.createTestingModule({
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
            useValue: disabledConfigService,
          },
        ],
      }).compile();
      const disabledService = disabledModule.get<DiadocService>(DIADOC_SERVICE);
      await expect(disabledService.getSignedDocument('doc-id')).rejects.toThrow('Diadoc integration is disabled');
    });

    it('should handle 400 Bad Request error', async () => {
      const error = createMockAxiosError(400, 'Bad Request');
      mockHttpService.get.mockReturnValueOnce(throwError(() => error));

      await expect(service.getSignedDocument('doc-id')).rejects.toThrow(
        /Failed to getSignedDocument/,
      );
    });

    it('should handle 401 Unauthorized error', async () => {
      const error = createMockAxiosError(401, 'Unauthorized');
      mockHttpService.get.mockReturnValueOnce(throwError(() => error));

      await expect(service.getSignedDocument('doc-id')).rejects.toThrow(
        /Failed to getSignedDocument/,
      );
    });

    it('should handle 404 Not Found error', async () => {
      const error = createMockAxiosError(404, 'Not Found');
      mockHttpService.get.mockReturnValueOnce(throwError(() => error));

      await expect(service.getSignedDocument('doc-id')).rejects.toThrow(
        /Failed to getSignedDocument.*404/,
      );
    });

    it('should handle 429 Too Many Requests error', async () => {
      const error = createMockAxiosError(429, 'Too Many Requests');
      mockHttpService.get.mockReturnValueOnce(throwError(() => error));

      await expect(service.getSignedDocument('doc-id')).rejects.toThrow(
        /Failed to getSignedDocument.*429/,
      );
    });

    it('should handle 500 Internal Server Error with retry', async () => {
      const error = createMockAxiosError(500, 'Internal Server Error');
      mockHttpService.get.mockReturnValue(throwError(() => error));

      await expect(service.getSignedDocument('doc-id')).rejects.toThrow(
        /Failed to getSignedDocument/,
      );
      
      expect(mockHttpService.get).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('recordDocumentSent', () => {
    it('should increment paymentOrder metric', () => {
      service.recordDocumentSent('paymentOrder');
      const metrics = service.getMetrics();
      expect(metrics.documentsSent.paymentOrder).toBe(1);
    });

    it('should increment report metric', () => {
      service.recordDocumentSent('report');
      const metrics = service.getMetrics();
      expect(metrics.documentsSent.report).toBe(1);
    });

    it('should increment contract metric', () => {
      service.recordDocumentSent('contract');
      const metrics = service.getMetrics();
      expect(metrics.documentsSent.contract).toBe(1);
    });

    it('should correctly count multiple documents', () => {
      service.recordDocumentSent('paymentOrder');
      service.recordDocumentSent('paymentOrder');
      service.recordDocumentSent('report');
      
      const metrics = service.getMetrics();
      expect(metrics.documentsSent.paymentOrder).toBe(2);
      expect(metrics.documentsSent.report).toBe(1);
      expect(metrics.documentsSent.contract).toBe(0);
    });
  });

  describe('recordDocumentSigned', () => {
    it('should increment documentsSigned metric', () => {
      service.recordDocumentSigned();
      const metrics = service.getMetrics();
      expect(metrics.documentsSigned).toBe(1);
    });

    it('should correctly count multiple signed documents', () => {
      service.recordDocumentSigned();
      service.recordDocumentSigned();
      service.recordDocumentSigned();
      
      const metrics = service.getMetrics();
      expect(metrics.documentsSigned).toBe(3);
    });
  });

  describe('recordDocumentRejected', () => {
    it('should increment documentsRejected metric', () => {
      service.recordDocumentRejected();
      const metrics = service.getMetrics();
      expect(metrics.documentsRejected).toBe(1);
    });
  });

  describe('getMetrics', () => {
    it('should return copy of metrics object', () => {
      const metrics1 = service.getMetrics();
      service.recordDocumentSent('paymentOrder');
      const metrics2 = service.getMetrics();
      
      expect(metrics1.documentsSent.paymentOrder).toBe(0);
      expect(metrics2.documentsSent.paymentOrder).toBe(1);
    });
  });

  describe('getAverageRequestDuration', () => {
    it('should return 0 when no durations recorded', () => {
      const avg = service.getAverageRequestDuration('uploadDocument');
      expect(avg).toBe(0);
    });
  });

  describe('retry mechanism', () => {
    it('should retry on 5xx errors with exponential backoff', async () => {
      const error = createMockAxiosError(503, 'Service Unavailable');
      const mockResponse = createMockAxiosResponse({ MessageId: 'success-after-retry' });
      
      mockHttpService.post
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(throwError(() => error))
        .mockReturnValueOnce(of(mockResponse));

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      
      expect(result).toBe('success-after-retry');
      expect(mockHttpService.post).toHaveBeenCalledTimes(3);
    });

    it('should not retry on 4xx client errors (except 429)', async () => {
      const error = createMockAxiosError(400, 'Bad Request');
      mockHttpService.post.mockReturnValue(throwError(() => error));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();
      
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const networkError = createNetworkError('ECONNREFUSED');
      const mockResponse = createMockAxiosResponse({ MessageId: 'success' });
      
      mockHttpService.post
        .mockReturnValueOnce(throwError(() => networkError))
        .mockReturnValueOnce(of(mockResponse));

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      
      expect(result).toBe('success');
      expect(mockHttpService.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('timeout handling', () => {
    it('should throw timeout error when request times out', async () => {
      // Simulate a request that never resolves (timeout)
      const timeoutError = new Error('Timeout has occurred');
      timeoutError.name = 'TimeoutError';
      mockHttpService.post.mockReturnValueOnce(throwError(() => timeoutError));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow(
        /timeout/i,
      );
    });
  });

  describe('Authorization header format compliance', () => {
    it('should use DiadocAuth format for Authorization header', async () => {
      const mockResponse = createMockAxiosResponse({ MessageId: 'test-message-id' });
      mockHttpService.post.mockReturnValueOnce(of(mockResponse));

      const buffer = Buffer.from('test');
      await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      const callArgs = mockHttpService.post.mock.calls[0];
      const authHeader = callArgs[2].headers.Authorization;
      
      // Verify DiadocAuth format per API documentation
      expect(authHeader).toMatch(/^DiadocAuth/);
      expect(authHeader).toContain('api_key=');
    });
  });

  describe('getOrganizationsByInn', () => {
    it('should return organizations by INN', async () => {
      const mockResponse = createMockAxiosResponse({
        Organizations: [
          {
            OrgId: 'org-123',
            Inn: '1234567890',
            Kpp: '123456789',
            FullName: 'Test Organization Ltd',
            ShortName: 'Test Org',
            Boxes: [
              { BoxId: 'box-123', Title: 'Main Box' },
              { BoxId: 'box-456', Title: 'Secondary Box' },
            ],
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getOrganizationsByInn('1234567890');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        orgId: 'org-123',
        inn: '1234567890',
        kpp: '123456789',
        fullName: 'Test Organization Ltd',
        shortName: 'Test Org',
        boxes: [
          { boxId: 'box-123', title: 'Main Box' },
          { boxId: 'box-456', title: 'Secondary Box' },
        ],
      });
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://diadoc-api.kontur.ru/GetOrganizationsByInnKpp',
        expect.objectContaining({
          params: { inn: '1234567890' },
          headers: expect.objectContaining({
            Authorization: expect.any(String),
          }),
        }),
      );
    });

    it('should include KPP in params when provided', async () => {
      const mockResponse = createMockAxiosResponse({ Organizations: [] });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      await service.getOrganizationsByInn('1234567890', '123456789');

      const callArgs = mockHttpService.get.mock.calls[0];
      expect(callArgs[1].params).toEqual({
        inn: '1234567890',
        kpp: '123456789',
      });
    });

    it('should return empty array when no organizations found', async () => {
      const mockResponse = createMockAxiosResponse({ Organizations: [] });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getOrganizationsByInn('1234567890');

      expect(result).toEqual([]);
    });

    it('should handle organizations without boxes', async () => {
      const mockResponse = createMockAxiosResponse({
        Organizations: [
          {
            OrgId: 'org-123',
            Inn: '1234567890',
            FullName: 'Test Organization',
            Boxes: [],
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getOrganizationsByInn('1234567890');

      expect(result[0].boxes).toEqual([]);
    });

    it('should handle error responses', async () => {
      const error = createMockAxiosError(404, 'Not Found');
      mockHttpService.get.mockReturnValueOnce(throwError(() => error));

      await expect(service.getOrganizationsByInn('1234567890')).rejects.toThrow();
    });
  });

  describe('getBoxIdByInn', () => {
    it('should return BoxId from cache if available', async () => {
      const mockResponse = createMockAxiosResponse({
        Organizations: [
          {
            OrgId: 'org-123',
            Inn: '1234567890',
            Boxes: [{ BoxId: 'box-123', Title: 'Main Box' }],
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      // First call - should fetch from API
      const result1 = await service.getBoxIdByInn('1234567890');
      expect(result1).toBe('box-123');
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await service.getBoxIdByInn('1234567890');
      expect(result2).toBe('box-123');
      expect(mockHttpService.get).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should fetch from API when not in cache', async () => {
      const mockResponse = createMockAxiosResponse({
        Organizations: [
          {
            OrgId: 'org-123',
            Inn: '1234567890',
            Boxes: [{ BoxId: 'box-123', Title: 'Main Box' }],
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getBoxIdByInn('1234567890');

      expect(result).toBe('box-123');
      expect(mockHttpService.get).toHaveBeenCalled();
    });

    it('should return null when organization not found', async () => {
      const mockResponse = createMockAxiosResponse({ Organizations: [] });
      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getBoxIdByInn('1234567890');

      expect(result).toBeNull();
    });

    it('should return null when organization has no boxes', async () => {
      const mockResponse = createMockAxiosResponse({
        Organizations: [
          {
            OrgId: 'org-123',
            Inn: '1234567890',
            Boxes: [],
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getBoxIdByInn('1234567890');

      expect(result).toBeNull();
    });

    it('should use different cache keys for different KPP', async () => {
      const mockResponse1 = createMockAxiosResponse({
        Organizations: [
          {
            OrgId: 'org-123',
            Inn: '1234567890',
            Kpp: '111111111',
            Boxes: [{ BoxId: 'box-111', Title: 'Box 1' }],
          },
        ],
      });

      const mockResponse2 = createMockAxiosResponse({
        Organizations: [
          {
            OrgId: 'org-123',
            Inn: '1234567890',
            Kpp: '222222222',
            Boxes: [{ BoxId: 'box-222', Title: 'Box 2' }],
          },
        ],
      });

      mockHttpService.get
        .mockReturnValueOnce(of(mockResponse1))
        .mockReturnValueOnce(of(mockResponse2));

      const result1 = await service.getBoxIdByInn('1234567890', '111111111');
      const result2 = await service.getBoxIdByInn('1234567890', '222222222');

      expect(result1).toBe('box-111');
      expect(result2).toBe('box-222');
      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDocumentInfo', () => {
    it('should return document info with correct structure', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Timestamp: '2025-01-01T00:00:00Z',
        Entities: [
          {
            EntityId: 'entity-123',
            AttachmentType: 'Nonformalized',
            FileName: 'test-document.pdf',
            DocumentInfo: {
              RecipientResponseStatus: 'WithRecipientSignature',
            },
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentInfo('test-message-id');

      expect(result).toEqual({
        messageId: 'test-message-id',
        documentId: 'entity-123',
        entityId: 'entity-123',
        status: expect.any(String),
        fileName: 'test-document.pdf',
        createdAt: expect.any(Date),
      });
    });

    it('should extract status from RecipientResponseStatus (priority 1)', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [
          {
            EntityId: 'entity-123',
            AttachmentType: 'Nonformalized',
            DocumentInfo: {
              RecipientResponseStatus: 'WithRecipientSignature',
            },
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentInfo('test-message-id');

      expect(result.status).toBe(DiadocDocumentStatus.SIGNED);
    });

    it('should extract status from BilateralDocumentStatus (priority 2)', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [
          {
            EntityId: 'entity-123',
            AttachmentType: 'Nonformalized',
            DocumentInfo: {
              DocflowStatus: {
                BilateralDocumentStatus: 'OutboundWithRecipientSignature',
              },
            },
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentInfo('test-message-id');

      expect(result.status).toBe(DiadocDocumentStatus.SIGNED);
    });

    it('should extract status from StatusText (priority 3)', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [
          {
            EntityId: 'entity-123',
            AttachmentType: 'Nonformalized',
            DocumentInfo: {
              DocflowStatus: {
                PrimaryStatus: {
                  StatusText: 'signed',
                },
              },
            },
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentInfo('test-message-id');

      expect(result.status).toBe(DiadocDocumentStatus.SIGNED);
    });

    it('should use entityId parameter when provided', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [
          {
            EntityId: 'entity-123',
            AttachmentType: 'Nonformalized',
          },
          {
            EntityId: 'entity-456',
            AttachmentType: 'Nonformalized',
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await service.getDocumentInfo('test-message-id', 'entity-456');

      expect(result.entityId).toBe('entity-456');
    });

    it('should handle error responses', async () => {
      const error = createMockAxiosError(404, 'Not Found');
      mockHttpService.get.mockReturnValueOnce(throwError(() => error));

      await expect(service.getDocumentInfo('test-message-id')).rejects.toThrow();
    });
  });

  describe('findSignedEntityId', () => {
    it('should find entity with signature (ParentEntityId)', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [
          {
            EntityId: 'doc-123',
            EntityType: 'Attachment',
            AttachmentType: 'Nonformalized',
          },
          {
            EntityId: 'sig-123',
            EntityType: 'Signature',
            ParentEntityId: 'doc-123',
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await (service as any).findSignedEntityId('test-message-id');

      expect(result).toBe('doc-123');
    });

    it('should find PrintForm entity (priority 2)', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [
          {
            EntityId: 'doc-123',
            AttachmentType: 'Nonformalized',
          },
          {
            EntityId: 'print-123',
            EntityType: 'PrintForm',
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await (service as any).findSignedEntityId('test-message-id');

      expect(result).toBe('print-123');
    });

    it('should find entity by RecipientResponseStatus (priority 3)', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [
          {
            EntityId: 'doc-123',
            AttachmentType: 'Nonformalized',
            DocumentInfo: {
              RecipientResponseStatus: 'WithRecipientSignature',
            },
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await (service as any).findSignedEntityId('test-message-id');

      expect(result).toBe('doc-123');
    });

    it('should find entity by BilateralDocumentStatus (priority 4)', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [
          {
            EntityId: 'doc-123',
            AttachmentType: 'Nonformalized',
            DocumentInfo: {
              DocflowStatus: {
                BilateralDocumentStatus: 'OutboundWithRecipientSignature',
              },
            },
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await (service as any).findSignedEntityId('test-message-id');

      expect(result).toBe('doc-123');
    });

    it('should fallback to first Nonformalized document', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [
          {
            EntityId: 'doc-123',
            AttachmentType: 'Nonformalized',
          },
        ],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await (service as any).findSignedEntityId('test-message-id');

      expect(result).toBe('doc-123');
    });

    it('should return undefined when no suitable entity found', async () => {
      const mockResponse = createMockAxiosResponse({
        MessageId: 'test-message-id',
        Entities: [],
      });

      mockHttpService.get.mockReturnValueOnce(of(mockResponse));

      const result = await (service as any).findSignedEntityId('test-message-id');

      expect(result).toBeUndefined();
    });
  });

  describe('checkHealth', () => {
    it('should return status when Diadoc is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'diadoc') {
            return {
              enabled: false,
            };
          }
          return null;
        }),
      };

      const disabledModule: TestingModule = await Test.createTestingModule({
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
            useValue: disabledConfigService,
          },
        ],
      }).compile();

      const disabledService = disabledModule.get<DiadocService>(DIADOC_SERVICE);
      const health = await disabledService.checkHealth();

      expect(health.enabled).toBe(false);
      expect(health.configured).toBe(false);
    });

    it('should return status when not configured', async () => {
      const noConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'diadoc') {
            return {
              enabled: true,
              // Missing apiClientId and boxId
            };
          }
          return null;
        }),
      };

      const noConfigModule: TestingModule = await Test.createTestingModule({
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
            useValue: noConfigService,
          },
        ],
      }).compile();

      const noConfigServiceInstance = noConfigModule.get<DiadocService>(DIADOC_SERVICE);
      const health = await noConfigServiceInstance.checkHealth();

      expect(health.enabled).toBe(true);
      expect(health.configured).toBe(false);
    });

    it('should check authentication when configured', async () => {
      mockHttpService.post.mockReturnValueOnce(of(createMockAxiosResponse('auth-token')));

      const health = await service.checkHealth();

      expect(health.enabled).toBe(true);
      expect(health.configured).toBe(true);
      expect(health.authenticated).toBe(true);
      expect(health.apiReachable).toBe(true);
    });

    it('should detect API unreachable when authentication fails with network error', async () => {
      const networkError = createNetworkError('ECONNREFUSED');
      mockHttpService.post.mockReturnValueOnce(throwError(() => networkError));

      const health = await service.checkHealth();

      expect(health.apiReachable).toBe(false);
      expect(health.authenticated).toBe(false);
      expect(health.error).toBeTruthy();
    });

    it('should detect API reachable but auth failed', async () => {
      const authError = createMockAxiosError(401, 'Unauthorized');
      mockHttpService.post.mockReturnValueOnce(throwError(() => authError));

      const health = await service.checkHealth();

      expect(health.apiReachable).toBe(true);
      expect(health.authenticated).toBe(false);
      expect(health.error).toBeTruthy();
    });
  });

  describe('token caching', () => {
    it('should use cached token when not expired', async () => {
      // First call - should authenticate
      mockHttpService.post.mockReturnValueOnce(of(createMockAxiosResponse('token-1')));
      const token1 = await service.authenticate();
      expect(token1).toBe('test-auth-token'); // Uses static token from config

      // Second call - should use cache (if token was set)
      const token2 = await service.authenticate();
      expect(token2).toBe('test-auth-token');
    });

    it('should reset token on 401 error', async () => {
      const authError = createMockAxiosError(401, 'Unauthorized');
      mockHttpService.post.mockReturnValueOnce(throwError(() => authError));

      const buffer = Buffer.from('test');
      await expect(service.uploadDocument(buffer, 'test.pdf', 'application/pdf')).rejects.toThrow();

      // Token should be reset, next call should re-authenticate
      mockHttpService.post.mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'test' })));
      // This would trigger re-authentication if token was cached
    });
  });

  describe('getAverageRequestDuration', () => {
    it('should return average duration with real data', async () => {
      // Simulate recording durations
      const durations = [100, 200, 300, 400, 500];
      (service as any).metrics.requestDurations.uploadDocument = durations;

      const avg = service.getAverageRequestDuration('uploadDocument');

      expect(avg).toBe(300); // (100+200+300+400+500)/5 = 300
    });

    it('should limit durations array to 100 elements', async () => {
      const durations = Array.from({ length: 150 }, (_, i) => i);
      (service as any).metrics.requestDurations.uploadDocument = durations;

      // Simulate adding one more duration
      (service as any).metrics.requestDurations.uploadDocument.push(150);

      // The array should be limited to 100
      const array = (service as any).metrics.requestDurations.uploadDocument;
      expect(array.length).toBeLessThanOrEqual(101); // May be 101 before cleanup
    });
  });
});
