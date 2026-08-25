import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import * as request from 'supertest';
import { setupTestDatabase, teardownTestDatabase } from './mongodb-memory-server';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import config from '../../src/config';

let app: INestApplication;
let moduleFixture: TestingModule;

// Mock DiadocService для E2E тестов
const mockDiadocService = {
  authenticate: jest.fn().mockResolvedValue('mock-auth-token'),
  uploadDocument: jest.fn().mockResolvedValue({ documentId: 'mock-doc-id', messageId: 'mock-msg-id' }),
  sendForSigning: jest.fn().mockResolvedValue('mock-message-id'),
  getDocumentStatus: jest.fn().mockResolvedValue({ status: 'SIGNED' }),
  getSignedDocument: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
  getOrganizationsByInn: jest.fn().mockResolvedValue([{ inn: '1234567890', name: 'Test Org', boxes: [{ boxId: 'test-box' }] }]),
  checkHealth: jest.fn().mockResolvedValue({ enabled: true, configured: true, authenticated: true, apiReachable: true }),
  getMetrics: jest.fn().mockResolvedValue({ documentsSent: {}, documentsSigned: 0, errors: {} }),
  recordDocumentSent: jest.fn(),
  getBoxIdByInn: jest.fn().mockResolvedValue('test-box-id'),
};

beforeAll(async () => {
  // Setup test database
  const mongoUri = await setupTestDatabase();

  // Override MongoDB URL for tests
  process.env.MONGODB_URL = mongoUri;
  process.env.DIADOC_ENABLED = 'true';
  process.env.DIADOC_API_URL = 'https://diadoc-api.kontur.ru';
  process.env.DIADOC_API_CLIENT_ID = 'test-client-id';
  process.env.DIADOC_AUTH_TOKEN = 'test-token';
  process.env.DIADOC_BOX_ID = 'test-box-id';

  moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(DIADOC_SERVICE)
    .useValue(mockDiadocService)
    .compile();

  app = moduleFixture.createNestApplication();
  
  // Apply global pipes and filters like in bootstrap
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const configService = app.get(ConfigService);
  app.setGlobalPrefix(`api/${configService.get('version')}`);

  await app.init();
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
  await teardownTestDatabase();
});

// Export для использования в тестах
export { app, request, moduleFixture, mockDiadocService };
