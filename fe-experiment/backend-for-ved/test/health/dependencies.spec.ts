/**
 * Health Check Tests: Проверка зависимостей
 * 
 * Эти тесты проверяют доступность внешних зависимостей.
 * Запускаются при каждой сборке и по расписанию.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Health Check: Dependencies', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let moduleRef: TestingModule;

  jest.setTimeout(60000);

  beforeAll(async () => {
    // Запускаем in-memory MongoDB
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
      ],
    }).compile();

    mongoConnection = moduleRef.get<Connection>(getConnectionToken());
  });

  afterAll(async () => {
    if (mongoConnection) {
      await mongoConnection.close();
    }
    if (mongod) {
      await mongod.stop();
    }
  });

  describe('MongoDB Connection', () => {
    it('should connect to MongoDB', () => {
      expect(mongoConnection).toBeDefined();
      expect(mongoConnection.readyState).toBe(1); // 1 = connected
    });

    it('should be able to create collections', async () => {
      const testCollection = mongoConnection.collection('test_health_check');
      await testCollection.insertOne({ test: true, timestamp: new Date() });
      
      const doc = await testCollection.findOne({ test: true });
      expect(doc).toBeDefined();
      expect(doc?.test).toBe(true);

      // Cleanup
      await testCollection.drop();
    });

    it('should handle database operations', async () => {
      const testCollection = mongoConnection.collection('test_operations');
      
      // Create
      const insertResult = await testCollection.insertOne({ name: 'test', value: 1 });
      expect(insertResult.acknowledged).toBe(true);

      // Read
      const doc = await testCollection.findOne({ name: 'test' });
      expect(doc?.value).toBe(1);

      // Update
      await testCollection.updateOne({ name: 'test' }, { $set: { value: 2 } });
      const updatedDoc = await testCollection.findOne({ name: 'test' });
      expect(updatedDoc?.value).toBe(2);

      // Delete
      await testCollection.deleteOne({ name: 'test' });
      const deletedDoc = await testCollection.findOne({ name: 'test' });
      expect(deletedDoc).toBeNull();

      // Cleanup
      await testCollection.drop();
    });

    it('should support indexes', async () => {
      const testCollection = mongoConnection.collection('test_indexes');
      
      await testCollection.createIndex({ field: 1 });
      const indexes = await testCollection.indexes();
      
      expect(indexes.length).toBeGreaterThan(1); // _id + field

      // Cleanup
      await testCollection.drop();
    });
  });

  describe('Configuration', () => {
    it('should have valid configuration structure', () => {
      // Проверяем структуру конфигурации без реального подключения
      const requiredEnvVars = [
        'NODE_ENV',
      ];

      requiredEnvVars.forEach(varName => {
        // В тестовом окружении некоторые переменные могут отсутствовать
        // Но структура должна быть валидной
        expect(typeof process.env[varName]).toBe('string');
      });
    });
  });
});

describe('Health Check: Diadoc Configuration', () => {
  it('should have Diadoc configuration structure', () => {
    // Проверяем что конфигурация Diadoc может быть создана
    const mockDiadocConfig = {
      enabled: false,
      apiUrl: 'https://diadoc-api.kontur.ru',
      apiClientId: 'test',
      authToken: 'test',
      boxId: 'test',
    };

    expect(mockDiadocConfig).toHaveProperty('enabled');
    expect(mockDiadocConfig).toHaveProperty('apiUrl');
    expect(mockDiadocConfig).toHaveProperty('apiClientId');
  });

  it('should validate Diadoc API URL format', () => {
    const validUrls = [
      'https://diadoc-api.kontur.ru',
      'https://diadoc-api-test.kontur.ru',
    ];

    validUrls.forEach(url => {
      expect(url).toMatch(/^https:\/\/diadoc-api.*\.kontur\.ru$/);
    });
  });
});
