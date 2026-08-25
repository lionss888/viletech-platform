/**
 * VF-2: Tests for Diadoc Implementation Validation
 * Validates implementation against official documentation
 * Based on: https://developer.kontur.ru/docs/diadoc-api/index.html
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { IDiadocService } from '../../src/modules/diadoc/service/diadoc.service.interface';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('Diadoc Implementation Validation', () => {
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

  describe('API Methods Implementation', () => {
    it('should implement uploadDocument method', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-id' })),
      );

      const buffer = Buffer.from('test');
      const result = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');

      expect(result).toBeDefined();
      expect(result.messageId).toBeDefined();
    });

    it('should implement sendForSigning method', async () => {
      mockHttpService.post
        .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'upload-id' })))
        .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'send-id' })));

      const buffer = Buffer.from('test');
      const uploadResult = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      const result = await service.sendForSigning(
        uploadResult.messageId,
        'recipient-box-id',
        '1234567890',
      );

      expect(result).toBeDefined();
    });

    it('should implement getDocumentStatus method', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      const result = await service.getDocumentStatus('test-message-id');

      expect(result).toBeDefined();
      expect(result.status).toBeDefined();
    });

    it('should implement getSignedDocument method', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse(Buffer.from('content'))),
      );

      const result = await service.getSignedDocument('test-message-id', 'test-entity-id');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should implement getOrganizationByInn method', async () => {
      mockHttpService.get.mockReturnValueOnce(
        of(
          createMockAxiosResponse({
            Organizations: [
              {
                OrgId: 'org-id',
                Inn: '1234567890',
                FullName: 'Test Org',
                Boxes: [{ BoxId: 'box-id', Title: 'Test Box' }],
              },
            ],
          }),
        ),
      );

      const result = await service.getOrganizationsByInn('1234567890');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement IDiadocService interface', () => {
      expect(service).toBeInstanceOf(DiadocService);
      expect(service).toHaveProperty('uploadDocument');
      expect(service).toHaveProperty('sendForSigning');
      expect(service).toHaveProperty('getDocumentStatus');
      expect(service).toHaveProperty('getSignedDocument');
      expect(service).toHaveProperty('getOrganizationsByInn');
    });

    it('should have all required methods from interface', () => {
      const requiredMethods: (keyof IDiadocService)[] = [
        'uploadDocument',
        'sendForSigning',
        'getDocumentStatus',
        'getSignedDocument',
        'getOrganizationsByInn',
        'authenticate',
        'checkHealth',
        'getMetrics',
      ];

      requiredMethods.forEach((method) => {
        expect(service).toHaveProperty(method);
        expect(typeof (service as any)[method]).toBe('function');
      });
    });
  });

  describe('Workflow Compliance', () => {
    it('should follow upload -> send -> check status flow', async () => {
      mockHttpService.post
        .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'upload-id' })))
        .mockReturnValueOnce(of(createMockAxiosResponse({ MessageId: 'send-id' })));
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse({ Status: 'SIGNED' })),
      );

      const buffer = Buffer.from('test');
      const uploadResult = await service.uploadDocument(buffer, 'test.pdf', 'application/pdf');
      const sendResult = await service.sendForSigning(
        uploadResult.messageId,
        'recipient-box-id',
        '1234567890',
      );
      const statusResult = await service.getDocumentStatus(sendResult);

      expect(uploadResult.messageId).toBeDefined();
      expect(sendResult).toBeDefined();
      expect(statusResult.status).toBeDefined();
    });
  });
});
