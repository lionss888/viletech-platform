/**
 * E2E Tests with Mock Diadoc Server
 * 
 * Тесты с реальными HTTP запросами к Mock Diadoc Server.
 * Проверяет что DiadocService правильно взаимодействует с API.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { createMockDiadocServer, MockDiadocServer } from '../mocks/diadoc-mock-server';

describe('E2E: DiadocService with Mock Server', () => {
  let service: DiadocService;
  let mockServer: MockDiadocServer;
  let moduleRef: TestingModule;
  const mockServerPort = 3997;

  jest.setTimeout(30000);

  beforeAll(async () => {
    // Запускаем Mock Diadoc Server
    mockServer = createMockDiadocServer(mockServerPort);
    await mockServer.start();

    moduleRef = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        {
          provide: DIADOC_SERVICE,
          useClass: DiadocService,
        },
        DiadocService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'diadoc') {
                return {
                  enabled: true,
                  apiUrl: `http://localhost:${mockServerPort}`,
                  apiClientId: 'test-api-client-id',
                  authToken: 'test-auth-token',
                  boxId: 'test-box-id',
                  maxRetries: 0,
                  timeout: 5000,
                };
              }
              return null;
            },
          },
        },
        {
          provide: DiadocXmlGeneratorService,
          useValue: {
            generatePaymentOrderXml: jest.fn(),
            generateReportXml: jest.fn(),
            generateContractXml: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get<DiadocService>(DIADOC_SERVICE);
  });

  afterAll(async () => {
    if (moduleRef) await moduleRef.close();
    if (mockServer) await mockServer.stop();
  });

  afterEach(() => {
    mockServer.clearRequests();
  });

  describe('Authentication', () => {
    it('should authenticate successfully', async () => {
      const token = await service.authenticate();
      expect(token).toBeDefined();
    });
  });

  describe('Document Upload', () => {
    it('should upload document successfully', async () => {
      const fileBuffer = Buffer.from('test document content');
      const result = await service.uploadDocument(
        fileBuffer,
        'test-document.pdf',
        'application/pdf',
      );

      expect(result).toHaveProperty('messageId');
      expect(result).toHaveProperty('documentId');
      expect(result.messageId).toContain('mock-message-id');
    });

    it('should send correct request to API', async () => {
      const fileBuffer = Buffer.from('test content');
      await service.uploadDocument(fileBuffer, 'test.pdf', 'application/pdf');

      const requests = mockServer.getRequests();
      const postMessageRequest = requests.find(r => r.path === '/V3/PostMessage');
      
      expect(postMessageRequest).toBeDefined();
      expect(postMessageRequest?.method).toBe('POST');
      expect(postMessageRequest?.headers['authorization']).toContain('DiadocAuth');
    });
  });

  describe('Document Status', () => {
    it('should get document status successfully', async () => {
      const status = await service.getDocumentStatus('test-message-id');
      expect(status).toBeDefined();
    });
  });

  describe('Organizations', () => {
    it('should get organizations by INN', async () => {
      const orgs = await service.getOrganizationsByInn('1234567890');
      expect(Array.isArray(orgs)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      mockServer.setServerError();

      const fileBuffer = Buffer.from('test');
      await expect(
        service.uploadDocument(fileBuffer, 'test.pdf', 'application/pdf'),
      ).rejects.toThrow();
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const health = await service.checkHealth();
      
      expect(health).toHaveProperty('enabled');
      expect(health).toHaveProperty('configured');
    });
  });
});
