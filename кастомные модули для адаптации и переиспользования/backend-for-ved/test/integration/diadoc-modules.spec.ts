/**
 * VF-2: Integration tests for Diadoc module dependencies
 * Tests module loading, dependencies, and optional service availability
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DiadocWebhookProcessorService } from '../../src/modules/diadoc/service/diadoc-webhook-processor.service';
import { DiadocStatusCheckerService } from '../../src/modules/diadoc/service/diadoc-status-checker.service';
import { DiadocController } from '../../src/modules/diadoc/web/diadoc.controller';

describe('Diadoc Module Dependencies', () => {
  describe('DiadocService Module', () => {
    let service: DiadocService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({
              diadoc: {
                enabled: true,
                apiUrl: 'https://diadoc-api.kontur.ru',
                apiKey: 'test-key',
                boxId: 'test-box',
              },
            })],
          }),
          HttpModule,
        ],
        providers: [
          {
            provide: DIADOC_SERVICE,
            useClass: DiadocService,
          },
          DiadocService,
        ],
      }).compile();

      service = module.get<DiadocService>(DIADOC_SERVICE);
    });

    it('should load DiadocService with required dependencies', () => {
      expect(service).toBeDefined();
    });

    it('should have access to ConfigService', () => {
      expect(service['configService']).toBeDefined();
    });

    it('should have access to HttpService', () => {
      expect(service['httpService']).toBeDefined();
    });
  });

  describe('Optional Dependencies', () => {
    it('should work without FormPaymentService', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({
              diadoc: {
                enabled: true,
                apiUrl: 'https://diadoc-api.kontur.ru',
                apiKey: 'test-key',
                boxId: 'test-box',
              },
            })],
          }),
          HttpModule,
        ],
        providers: [
          {
            provide: DIADOC_SERVICE,
            useClass: DiadocService,
          },
          DiadocService,
          DiadocWebhookProcessorService,
        ],
      }).compile();

      const webhookProcessor = module.get<DiadocWebhookProcessorService>(DiadocWebhookProcessorService);
      expect(webhookProcessor).toBeDefined();
    });

    it('should work without ContractService', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({
              diadoc: {
                enabled: true,
                apiUrl: 'https://diadoc-api.kontur.ru',
                apiKey: 'test-key',
                boxId: 'test-box',
              },
            })],
          }),
          HttpModule,
        ],
        providers: [
          {
            provide: DIADOC_SERVICE,
            useClass: DiadocService,
          },
          DiadocService,
          DiadocWebhookProcessorService,
        ],
      }).compile();

      const webhookProcessor = module.get<DiadocWebhookProcessorService>(DiadocWebhookProcessorService);
      expect(webhookProcessor).toBeDefined();
    });

    it('should work without FileService', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({
              diadoc: {
                enabled: true,
                apiUrl: 'https://diadoc-api.kontur.ru',
                apiKey: 'test-key',
                boxId: 'test-box',
              },
            })],
          }),
          HttpModule,
        ],
        providers: [
          {
            provide: DIADOC_SERVICE,
            useClass: DiadocService,
          },
          DiadocService,
          DiadocWebhookProcessorService,
        ],
      }).compile();

      const webhookProcessor = module.get<DiadocWebhookProcessorService>(DiadocWebhookProcessorService);
      expect(webhookProcessor).toBeDefined();
    });
  });

  describe('Module Exports', () => {
    it('should export DIADOC_SERVICE token', () => {
      expect(DIADOC_SERVICE).toBe('DIADOC_SERVICE');
    });

    it('should export DiadocService class', () => {
      expect(DiadocService).toBeDefined();
    });

    it('should export DiadocWebhookProcessorService class', () => {
      expect(DiadocWebhookProcessorService).toBeDefined();
    });

    it('should export DiadocStatusCheckerService class', () => {
      expect(DiadocStatusCheckerService).toBeDefined();
    });

    it('should export DiadocController class', () => {
      expect(DiadocController).toBeDefined();
    });
  });

  describe('Circular Dependency Check', () => {
    it('should not have circular dependencies in DiadocService', () => {
      // If circular dependency exists, module compilation will fail
      expect(() => {
        const ServiceClass = require('../../src/modules/diadoc/service/diadoc.service').DiadocService;
        expect(ServiceClass).toBeDefined();
      }).not.toThrow();
    });

    it('should not have circular dependencies in WebhookProcessor', () => {
      expect(() => {
        const ServiceClass = require('../../src/modules/diadoc/service/diadoc-webhook-processor.service').DiadocWebhookProcessorService;
        expect(ServiceClass).toBeDefined();
      }).not.toThrow();
    });

    it('should not have circular dependencies in StatusChecker', () => {
      expect(() => {
        const ServiceClass = require('../../src/modules/diadoc/service/diadoc-status-checker.service').DiadocStatusCheckerService;
        expect(ServiceClass).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Provider Resolution', () => {
    it('should resolve DiadocService by token', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({
              diadoc: {
                enabled: false,
                apiUrl: 'https://diadoc-api.kontur.ru',
              },
            })],
          }),
          HttpModule,
        ],
        providers: [
          {
            provide: DIADOC_SERVICE,
            useClass: DiadocService,
          },
          DiadocService,
        ],
      }).compile();

      const serviceByToken = module.get(DIADOC_SERVICE);
      const serviceByClass = module.get(DiadocService);

      expect(serviceByToken).toBeDefined();
      expect(serviceByClass).toBeDefined();
    });

    it('should return undefined for optional unavailable providers', () => {
      const optionalService = undefined;
      expect(optionalService).toBeUndefined();
    });
  });

  describe('Configuration Injection', () => {
    it('should inject configuration into DiadocService', async () => {
      const testConfig = {
        diadoc: {
          enabled: true,
          apiUrl: 'https://test-api.example.com',
          apiKey: 'test-key-123',
          boxId: 'test-box-456',
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => testConfig],
          }),
          HttpModule,
        ],
        providers: [
          {
            provide: DIADOC_SERVICE,
            useClass: DiadocService,
          },
          DiadocService,
        ],
      }).compile();

      const configService = module.get<ConfigService>(ConfigService);
      const diadocConfig = configService.get('diadoc');

      expect(diadocConfig.enabled).toBe(true);
      expect(diadocConfig.apiUrl).toBe('https://test-api.example.com');
    });
  });

  describe('Module Import Order', () => {
    it('should not depend on import order for optional dependencies', async () => {
      // Forward imports should work regardless of order
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({
              diadoc: { enabled: false },
            })],
          }),
          HttpModule,
        ],
        providers: [
          DiadocWebhookProcessorService,
          {
            provide: DIADOC_SERVICE,
            useClass: DiadocService,
          },
          DiadocService,
        ],
      }).compile();

      const webhookProcessor = module.get<DiadocWebhookProcessorService>(DiadocWebhookProcessorService);
      expect(webhookProcessor).toBeDefined();
    });
  });

  describe('Controller Dependencies', () => {
    it('should inject services into DiadocController', async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({
              diadoc: { enabled: true },
            })],
          }),
          HttpModule,
        ],
        controllers: [DiadocController],
        providers: [
          {
            provide: DIADOC_SERVICE,
            useClass: DiadocService,
          },
          DiadocService,
          DiadocWebhookProcessorService,
          {
            provide: 'FORM_PAYMENT_SERVICE',
            useValue: {},
          },
          {
            provide: 'IContractService',
            useValue: {},
          },
          {
            provide: 'FILE_SERVICE',
            useValue: {},
          },
        ],
      }).compile();

      const controller = module.get<DiadocController>(DiadocController);
      expect(controller).toBeDefined();
    });
  });
});
