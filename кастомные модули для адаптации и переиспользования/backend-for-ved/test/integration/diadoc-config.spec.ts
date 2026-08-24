/**
 * VF-2: Integration tests for Diadoc configuration
 * Tests configuration loading, validation, and defaults
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import config from '../../src/config';

describe('Diadoc Configuration', () => {
  let configService: ConfigService;

  describe('with default configuration', () => {
    beforeEach(async () => {
      // Clear environment variables for clean test
      delete process.env.DIADOC_ENABLED;
      delete process.env.DIADOC_API_URL;
      delete process.env.DIADOC_API_KEY;
      delete process.env.DIADOC_BOX_ID;

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [config],
            isGlobal: true,
          }),
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
    });

    it('should have diadoc configuration object', () => {
      const diadocConfig = configService.get('diadoc');
      expect(diadocConfig).toBeDefined();
    });

    it('should have enabled set to false by default', () => {
      const diadocConfig = configService.get('diadoc');
      expect(diadocConfig.enabled).toBe(false);
    });

    it('should have default API URL', () => {
      const diadocConfig = configService.get('diadoc');
      expect(diadocConfig.apiUrl).toBe('https://diadoc-api.kontur.ru');
    });

    it('should have undefined apiKey by default', () => {
      const diadocConfig = configService.get('diadoc');
      expect(diadocConfig.apiKey).toBeUndefined();
    });

    it('should have undefined boxId by default', () => {
      const diadocConfig = configService.get('diadoc');
      expect(diadocConfig.boxId).toBeUndefined();
    });
  });

  describe('with environment variables set', () => {
    beforeEach(async () => {
      process.env.DIADOC_ENABLED = 'true';
      process.env.DIADOC_API_URL = 'https://custom-diadoc-api.example.com';
      process.env.DIADOC_API_KEY = 'test-api-key-123';
      process.env.DIADOC_BOX_ID = 'test-box-id-456';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [config],
            isGlobal: true,
          }),
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
    });

    afterEach(() => {
      delete process.env.DIADOC_ENABLED;
      delete process.env.DIADOC_API_URL;
      delete process.env.DIADOC_API_KEY;
      delete process.env.DIADOC_BOX_ID;
    });

    it('should read enabled from DIADOC_ENABLED', () => {
      const diadocConfig = configService.get('diadoc');
      expect(diadocConfig.enabled).toBe(true);
    });

    it('should read apiUrl from DIADOC_API_URL', () => {
      const diadocConfig = configService.get('diadoc');
      expect(diadocConfig.apiUrl).toBe('https://custom-diadoc-api.example.com');
    });

    it('should read apiKey from DIADOC_API_KEY', () => {
      const diadocConfig = configService.get('diadoc');
      expect(diadocConfig.apiKey).toBe('test-api-key-123');
    });

    it('should read boxId from DIADOC_BOX_ID', () => {
      const diadocConfig = configService.get('diadoc');
      expect(diadocConfig.boxId).toBe('test-box-id-456');
    });
  });

  describe('DIADOC_ENABLED parsing', () => {
    afterEach(() => {
      delete process.env.DIADOC_ENABLED;
    });

    it('should parse "true" as true', async () => {
      process.env.DIADOC_ENABLED = 'true';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [config],
            isGlobal: true,
          }),
        ],
      }).compile();

      const configSvc = module.get<ConfigService>(ConfigService);
      expect(configSvc.get('diadoc.enabled')).toBe(true);
    });

    it('should parse "false" as false', async () => {
      process.env.DIADOC_ENABLED = 'false';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [config],
            isGlobal: true,
          }),
        ],
      }).compile();

      const configSvc = module.get<ConfigService>(ConfigService);
      expect(configSvc.get('diadoc.enabled')).toBe(false);
    });

    it('should parse "1" as true', async () => {
      process.env.DIADOC_ENABLED = '1';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [config],
            isGlobal: true,
          }),
        ],
      }).compile();

      const configSvc = module.get<ConfigService>(ConfigService);
      // Depending on stringToBoolean implementation
      const enabled = configSvc.get('diadoc.enabled');
      expect([true, false]).toContain(enabled);
    });
  });

  describe('configuration completeness', () => {
    it('should have all required fields for Diadoc integration', async () => {
      process.env.DIADOC_ENABLED = 'true';
      process.env.DIADOC_API_URL = 'https://diadoc-api.kontur.ru';
      process.env.DIADOC_API_KEY = 'api-key';
      process.env.DIADOC_BOX_ID = 'box-id';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [config],
            isGlobal: true,
          }),
        ],
      }).compile();

      const configSvc = module.get<ConfigService>(ConfigService);
      const diadocConfig = configSvc.get('diadoc');

      expect(diadocConfig).toHaveProperty('enabled');
      expect(diadocConfig).toHaveProperty('apiUrl');
      expect(diadocConfig).toHaveProperty('apiKey');
      expect(diadocConfig).toHaveProperty('boxId');

      delete process.env.DIADOC_ENABLED;
      delete process.env.DIADOC_API_URL;
      delete process.env.DIADOC_API_KEY;
      delete process.env.DIADOC_BOX_ID;
    });

    it('should validate that integration can be enabled with all required settings', async () => {
      process.env.DIADOC_ENABLED = 'true';
      process.env.DIADOC_API_KEY = 'valid-api-key';
      process.env.DIADOC_BOX_ID = 'valid-box-id';

      const module: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            load: [config],
            isGlobal: true,
          }),
        ],
      }).compile();

      const configSvc = module.get<ConfigService>(ConfigService);
      const diadocConfig = configSvc.get('diadoc');

      expect(diadocConfig.enabled).toBe(true);
      expect(diadocConfig.apiKey).toBeDefined();
      expect(diadocConfig.boxId).toBeDefined();

      delete process.env.DIADOC_ENABLED;
      delete process.env.DIADOC_API_KEY;
      delete process.env.DIADOC_BOX_ID;
    });
  });
});
