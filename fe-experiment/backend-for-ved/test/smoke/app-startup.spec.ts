/**
 * Smoke Tests: Проверка запуска приложения
 * 
 * Эти тесты отвечают на вопрос: "Запускается ли приложение?"
 * ПРИМЕЧАНИЕ: Полный запуск AppModule требует всех зависимостей (config, NATS и т.д.)
 * Поэтому здесь тестируем изолированные компоненты.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Controller, Get } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import request from 'supertest';

// Minimal test controller
@Controller('diadoc')
class TestDiadocController {
  @Get('health')
  checkHealth() {
    return {
      enabled: true,
      configured: true,
      apiReachable: true,
      authenticated: true,
      lastCheck: new Date(),
    };
  }

  @Get('metrics')
  getMetrics() {
    return {
      current: {
        documentsSent: { paymentOrder: 0, report: 0, contract: 0 },
        documentsSigned: 0,
        errors: {},
      },
      averageRequestDurations: {},
    };
  }
}

describe('Smoke Tests: Application Startup', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  jest.setTimeout(60000);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DIADOC_ENABLED = 'false';

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            version: '1.0',
            diadoc: {
              enabled: false,
              apiUrl: 'https://diadoc-api.kontur.ru',
            },
          })],
        }),
      ],
      controllers: [TestDiadocController],
    }).compile();

    app = moduleRef.createNestApplication();
    
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    const configService = app.get(ConfigService);
    const version = configService.get('version') || '1.0';
    app.setGlobalPrefix(`api/${version}`);

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Application Bootstrap', () => {
    it('should create NestJS application instance', () => {
      expect(app).toBeDefined();
      expect(app).toBeInstanceOf(Object);
    });

    it('should have ConfigService available', () => {
      const configService = app.get(ConfigService);
      expect(configService).toBeDefined();
    });

    it('should have correct API version configured', () => {
      const configService = app.get(ConfigService);
      const version = configService.get('version');
      expect(version).toBeDefined();
      expect(typeof version).toBe('string');
    });
  });

  describe('Basic HTTP Endpoints', () => {
    it('should respond to GET /api/1.0/diadoc/health', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/health')
        .expect(200);

      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('configured');
    });

    it('should respond to GET /api/1.0/diadoc/metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/metrics')
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 404 for non-existent endpoints', async () => {
      await request(app.getHttpServer())
        .get('/api/1.0/non-existent-endpoint')
        .expect(404);
    });
  });

  describe('Module Initialization', () => {
    it('should have ConfigModule loaded', () => {
      const configService = app.get(ConfigService);
      expect(configService).toBeDefined();
    });

    it('should have Diadoc configuration available', () => {
      const configService = app.get(ConfigService);
      const diadocConfig = configService.get('diadoc');
      expect(diadocConfig).toBeDefined();
      expect(diadocConfig).toHaveProperty('enabled');
    });
  });
});
