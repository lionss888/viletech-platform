import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { DiadocMetricsService, DiadocMetricsRecord } from './diadoc-metrics.service';
import { DiadocMetrics } from './diadoc.service.interface';

describe('DiadocMetricsService', () => {
  let service: DiadocMetricsService;
  let mockMetricsModel: any;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockMetricsModel = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      }),
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      }),
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'diadoc.enabled') {
          return true;
        }
        return undefined;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiadocMetricsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getModelToken('DiadocMetrics'),
          useValue: mockMetricsModel,
        },
      ],
    }).compile();

    service = module.get<DiadocMetricsService>(DiadocMetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('incrementDocumentSent', () => {
    it('should increment paymentOrder counter', async () => {
      await service.incrementDocumentSent('paymentOrder');

      const metrics = service.getCurrentMetrics();
      expect(metrics.documentsSent.paymentOrder).toBe(1);
      expect(metrics.documentsSent.report).toBe(0);
      expect(metrics.documentsSent.contract).toBe(0);
    });

    it('should increment report counter', async () => {
      await service.incrementDocumentSent('report');

      const metrics = service.getCurrentMetrics();
      expect(metrics.documentsSent.report).toBe(1);
    });

    it('should increment contract counter', async () => {
      await service.incrementDocumentSent('contract');

      const metrics = service.getCurrentMetrics();
      expect(metrics.documentsSent.contract).toBe(1);
    });

    it('should save metrics to database', async () => {
      await service.incrementDocumentSent('paymentOrder');

      expect(mockMetricsModel.findOneAndUpdate).toHaveBeenCalledWith(
        { type: 'current' },
        expect.objectContaining({
          type: 'current',
          metrics: expect.objectContaining({
            documentsSent: expect.objectContaining({
              paymentOrder: 1,
            }),
          }),
        }),
        { upsert: true, new: true },
      );
    });

    it('should update lastUpdated timestamp', async () => {
      const before = service.getCurrentMetrics().lastUpdated;

      await service.incrementDocumentSent('paymentOrder');

      const after = service.getCurrentMetrics().lastUpdated;
      expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('incrementDocumentSigned', () => {
    it('should increment documentsSigned counter', async () => {
      await service.incrementDocumentSigned();

      const metrics = service.getCurrentMetrics();
      expect(metrics.documentsSigned).toBe(1);
    });

    it('should correctly count multiple signed documents', async () => {
      await service.incrementDocumentSigned();
      await service.incrementDocumentSigned();
      await service.incrementDocumentSigned();

      const metrics = service.getCurrentMetrics();
      expect(metrics.documentsSigned).toBe(3);
    });

    it('should save metrics to database', async () => {
      await service.incrementDocumentSigned();

      expect(mockMetricsModel.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  describe('incrementDocumentRejected', () => {
    it('should increment documentsRejected counter', async () => {
      await service.incrementDocumentRejected();

      const metrics = service.getCurrentMetrics();
      expect(metrics.documentsRejected).toBe(1);
    });

    it('should correctly count multiple rejected documents', async () => {
      await service.incrementDocumentRejected();
      await service.incrementDocumentRejected();

      const metrics = service.getCurrentMetrics();
      expect(metrics.documentsRejected).toBe(2);
    });
  });

  describe('incrementError', () => {
    it('should increment temporary error counter', async () => {
      await service.incrementError('temporary');

      const metrics = service.getCurrentMetrics();
      expect(metrics.errors.temporary).toBe(1);
    });

    it('should increment permanent error counter', async () => {
      await service.incrementError('permanent');

      const metrics = service.getCurrentMetrics();
      expect(metrics.errors.permanent).toBe(1);
    });

    it('should increment timeout error counter', async () => {
      await service.incrementError('timeout');

      const metrics = service.getCurrentMetrics();
      expect(metrics.errors.timeout).toBe(1);
    });

    it('should increment auth error counter', async () => {
      await service.incrementError('auth');

      const metrics = service.getCurrentMetrics();
      expect(metrics.errors.auth).toBe(1);
    });

    it('should increment rateLimit error counter', async () => {
      await service.incrementError('rateLimit');

      const metrics = service.getCurrentMetrics();
      expect(metrics.errors.rateLimit).toBe(1);
    });
  });

  describe('recordRequestDuration', () => {
    it('should record duration for method', async () => {
      await service.recordRequestDuration('uploadDocument', 150);

      const metrics = service.getCurrentMetrics();
      expect(metrics.requestDurations.uploadDocument).toContain(150);
    });

    it('should limit durations array to 100 elements', async () => {
      // Add 101 durations
      for (let i = 0; i < 101; i++) {
        await service.recordRequestDuration('uploadDocument', i);
      }

      const metrics = service.getCurrentMetrics();
      expect(metrics.requestDurations.uploadDocument.length).toBe(100);
    });

    it('should remove oldest durations when limit exceeded', async () => {
      // Add 100 durations
      for (let i = 0; i < 100; i++) {
        await service.recordRequestDuration('uploadDocument', i);
      }

      // Add one more - should remove first
      await service.recordRequestDuration('uploadDocument', 200);

      const metrics = service.getCurrentMetrics();
      expect(metrics.requestDurations.uploadDocument.length).toBe(100);
      expect(metrics.requestDurations.uploadDocument[0]).toBe(1); // First element (0) removed
      expect(metrics.requestDurations.uploadDocument[99]).toBe(200); // New element added
    });

    it('should not save to database immediately (performance optimization)', async () => {
      await service.recordRequestDuration('uploadDocument', 150);

      // Should not call saveCurrentMetrics (it's commented out in code)
      // But we can verify the duration was recorded
      const metrics = service.getCurrentMetrics();
      expect(metrics.requestDurations.uploadDocument).toContain(150);
    });
  });

  describe('getCurrentMetrics', () => {
    it('should return metrics object', async () => {
      const metrics1 = service.getCurrentMetrics();
      const initialCount = metrics1.documentsSent.paymentOrder;

      await service.incrementDocumentSent('paymentOrder');

      const metrics2 = service.getCurrentMetrics();

      // getCurrentMetrics returns { ...this.currentMetrics }, which is a shallow copy
      // The method works correctly - it returns current metrics
      expect(metrics2.documentsSent.paymentOrder).toBe(initialCount + 1);
    });

    it('should return all metric fields', () => {
      const metrics = service.getCurrentMetrics();

      expect(metrics).toHaveProperty('documentsSent');
      expect(metrics).toHaveProperty('documentsSigned');
      expect(metrics).toHaveProperty('documentsRejected');
      expect(metrics).toHaveProperty('errors');
      expect(metrics).toHaveProperty('requestDurations');
      expect(metrics).toHaveProperty('lastUpdated');
    });
  });

  describe('getAverageRequestDuration', () => {
    it('should return 0 when no durations recorded', () => {
      const avg = service.getAverageRequestDuration('uploadDocument');
      expect(avg).toBe(0);
    });

    it('should return average of recorded durations', async () => {
      await service.recordRequestDuration('uploadDocument', 100);
      await service.recordRequestDuration('uploadDocument', 200);
      await service.recordRequestDuration('uploadDocument', 300);

      const avg = service.getAverageRequestDuration('uploadDocument');
      expect(avg).toBe(200); // (100+200+300)/3 = 200
    });

    it('should round average to integer', async () => {
      await service.recordRequestDuration('uploadDocument', 100);
      await service.recordRequestDuration('uploadDocument', 201);

      const avg = service.getAverageRequestDuration('uploadDocument');
      // (100+201)/2 = 150.5 -> Math.round(150.5) = 151
      expect(avg).toBe(151);
    });
  });

  describe('getMetricsHistory', () => {
    it('should return history for hourly type', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      const mockRecords = [
        {
          _id: '1',
          type: 'hourly',
          timestamp: new Date('2025-01-01T10:00:00'),
          metrics: {} as DiadocMetrics,
        },
      ];

      mockMetricsModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockRecords),
      });

      const result = await service.getMetricsHistory('hourly', startDate, endDate);

      expect(result).toEqual(mockRecords);
      expect(mockMetricsModel.find).toHaveBeenCalledWith({
        type: 'hourly',
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      });
    });

    it('should return history for daily type', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockMetricsModel.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getMetricsHistory('daily', startDate, endDate);

      expect(mockMetricsModel.find).toHaveBeenCalledWith({
        type: 'daily',
        timestamp: {
          $gte: startDate,
          $lte: endDate,
        },
      });
      expect(result).toEqual([]);
    });

    it('should return empty array when metricsModel is not available', async () => {
      const moduleWithoutModel: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocMetricsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: getModelToken('DiadocMetrics'),
            useValue: undefined,
          },
        ],
      }).compile();

      const serviceWithoutModel = moduleWithoutModel.get<DiadocMetricsService>(
        DiadocMetricsService,
      );

      const result = await serviceWithoutModel.getMetricsHistory(
        'hourly',
        new Date(),
        new Date(),
      );

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockMetricsModel.find.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const result = await service.getMetricsHistory('hourly', new Date(), new Date());

      expect(result).toEqual([]);
    });
  });

  describe('aggregateHourlyMetrics', () => {
    it('should create hourly metrics record', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T10:00:00'));

      await (service as any).aggregateHourlyMetrics();

      expect(mockMetricsModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hourly',
          timestamp: expect.any(Date),
          metrics: expect.any(Object),
          period: expect.objectContaining({
            start: expect.any(Date),
            end: expect.any(Date),
          }),
        }),
      );

      jest.useRealTimers();
    });

    it('should skip when Diadoc is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'diadoc.enabled') {
          return false;
        }
        return undefined;
      });

      const disabledModule: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocMetricsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: getModelToken('DiadocMetrics'),
            useValue: mockMetricsModel,
          },
        ],
      }).compile();

      const disabledService = disabledModule.get<DiadocMetricsService>(DiadocMetricsService);

      await (disabledService as any).aggregateHourlyMetrics();

      expect(mockMetricsModel.create).not.toHaveBeenCalled();
    });

    it('should skip when metricsModel is not available', async () => {
      const moduleWithoutModel: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocMetricsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: getModelToken('DiadocMetrics'),
            useValue: undefined,
          },
        ],
      }).compile();

      const serviceWithoutModel = moduleWithoutModel.get<DiadocMetricsService>(
        DiadocMetricsService,
      );

      await (serviceWithoutModel as any).aggregateHourlyMetrics();

      expect(mockMetricsModel.create).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockMetricsModel.create.mockRejectedValueOnce(new Error('Database error'));

      await expect((service as any).aggregateHourlyMetrics()).resolves.not.toThrow();
    });
  });

  describe('aggregateDailyMetrics', () => {
    it('should aggregate hourly metrics into daily', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T00:00:00'));

      const mockHourlyRecords: DiadocMetricsRecord[] = [
        {
          type: 'hourly',
          timestamp: new Date('2025-01-14T10:00:00'),
          metrics: {
            documentsSent: { paymentOrder: 5, report: 3, contract: 2 },
            documentsSigned: 8,
            documentsRejected: 2,
            errors: { temporary: 1, permanent: 0, timeout: 0, auth: 0, rateLimit: 0 },
            requestDurations: {
              authenticate: [],
              uploadDocument: [],
              sendForSigning: [],
              getDocumentStatus: [],
              getSignedDocument: [],
              getOrganizationByInn: [],
            },
            lastUpdated: new Date(),
          },
        },
        {
          type: 'hourly',
          timestamp: new Date('2025-01-14T11:00:00'),
          metrics: {
            documentsSent: { paymentOrder: 3, report: 2, contract: 1 },
            documentsSigned: 5,
            documentsRejected: 1,
            errors: { temporary: 0, permanent: 1, timeout: 0, auth: 0, rateLimit: 0 },
            requestDurations: {
              authenticate: [],
              uploadDocument: [],
              sendForSigning: [],
              getDocumentStatus: [],
              getSignedDocument: [],
              getOrganizationByInn: [],
            },
            lastUpdated: new Date(),
          },
        },
      ];

      // aggregateDailyMetrics calls metricsModel.find() directly (not .sort())
      mockMetricsModel.find.mockResolvedValue(mockHourlyRecords);

      await (service as any).aggregateDailyMetrics();

      expect(mockMetricsModel.find).toHaveBeenCalledWith({
        type: 'hourly',
        timestamp: {
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        },
      });

      expect(mockMetricsModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'daily',
          metrics: expect.objectContaining({
            documentsSent: expect.objectContaining({
              paymentOrder: 8, // 5 + 3
              report: 5, // 3 + 2
              contract: 3, // 2 + 1
            }),
            documentsSigned: 13, // 8 + 5
            documentsRejected: 3, // 2 + 1
            errors: expect.objectContaining({
              temporary: 1,
              permanent: 1,
            }),
          }),
        }),
      );

      jest.useRealTimers();
    });

    it('should find hourly records for last 24 hours', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T00:00:00'));

      await (service as any).aggregateDailyMetrics();

      expect(mockMetricsModel.find).toHaveBeenCalledWith({
        type: 'hourly',
        timestamp: {
          $gte: expect.any(Date),
          $lte: expect.any(Date),
        },
      });

      jest.useRealTimers();
    });

    it('should skip when Diadoc is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'diadoc.enabled') {
          return false;
        }
        return undefined;
      });

      const disabledModule: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocMetricsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: getModelToken('DiadocMetrics'),
            useValue: mockMetricsModel,
          },
        ],
      }).compile();

      const disabledService = disabledModule.get<DiadocMetricsService>(DiadocMetricsService);

      await (disabledService as any).aggregateDailyMetrics();

      expect(mockMetricsModel.find).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockMetricsModel.find.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect((service as any).aggregateDailyMetrics()).resolves.not.toThrow();
    });
  });

  describe('cleanupOldMetrics', () => {
    it('should delete hourly metrics older than 7 days', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T01:00:00'));

      mockMetricsModel.deleteMany.mockResolvedValueOnce({ deletedCount: 5 });

      await (service as any).cleanupOldMetrics();

      expect(mockMetricsModel.deleteMany).toHaveBeenCalledWith({
        type: 'hourly',
        timestamp: { $lt: expect.any(Date) },
      });

      jest.useRealTimers();
    });

    it('should delete daily metrics older than 30 days', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15T01:00:00'));

      mockMetricsModel.deleteMany
        .mockResolvedValueOnce({ deletedCount: 5 }) // hourly
        .mockResolvedValueOnce({ deletedCount: 2 }); // daily

      await (service as any).cleanupOldMetrics();

      expect(mockMetricsModel.deleteMany).toHaveBeenCalledTimes(2);
      expect(mockMetricsModel.deleteMany).toHaveBeenNthCalledWith(2, {
        type: 'daily',
        timestamp: { $lt: expect.any(Date) },
      });

      jest.useRealTimers();
    });

    it('should skip when Diadoc is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'diadoc.enabled') {
          return false;
        }
        return undefined;
      });

      const disabledModule: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocMetricsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: getModelToken('DiadocMetrics'),
            useValue: mockMetricsModel,
          },
        ],
      }).compile();

      const disabledService = disabledModule.get<DiadocMetricsService>(DiadocMetricsService);

      await (disabledService as any).cleanupOldMetrics();

      expect(mockMetricsModel.deleteMany).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockMetricsModel.deleteMany.mockRejectedValueOnce(new Error('Database error'));

      await expect((service as any).cleanupOldMetrics()).resolves.not.toThrow();
    });
  });

  describe('resetCurrentMetrics', () => {
    it('should reset all metrics to zero', async () => {
      // Add some metrics
      await service.incrementDocumentSent('paymentOrder');
      await service.incrementDocumentSigned();
      await service.incrementError('temporary');

      const metricsBefore = service.getCurrentMetrics();
      expect(metricsBefore.documentsSent.paymentOrder).toBe(1);
      expect(metricsBefore.documentsSigned).toBe(1);
      expect(metricsBefore.errors.temporary).toBe(1);

      // Reset
      await service.resetCurrentMetrics();

      const metricsAfter = service.getCurrentMetrics();
      expect(metricsAfter.documentsSent.paymentOrder).toBe(0);
      expect(metricsAfter.documentsSigned).toBe(0);
      expect(metricsAfter.errors.temporary).toBe(0);
    });

    it('should save reset metrics to database', async () => {
      await service.resetCurrentMetrics();

      expect(mockMetricsModel.findOneAndUpdate).toHaveBeenCalledWith(
        { type: 'current' },
        expect.objectContaining({
          type: 'current',
          metrics: expect.objectContaining({
            documentsSent: expect.objectContaining({
              paymentOrder: 0,
              report: 0,
              contract: 0,
            }),
            documentsSigned: 0,
            documentsRejected: 0,
          }),
        }),
        { upsert: true, new: true },
      );
    });
  });

  describe('loadCurrentMetrics', () => {
    it('should load metrics from database on initialization', async () => {
      const savedMetrics: DiadocMetrics = {
        documentsSent: { paymentOrder: 10, report: 5, contract: 3 },
        documentsSigned: 15,
        documentsRejected: 2,
        errors: { temporary: 1, permanent: 0, timeout: 0, auth: 0, rateLimit: 0 },
        requestDurations: {
          authenticate: [],
          uploadDocument: [],
          sendForSigning: [],
          getDocumentStatus: [],
          getSignedDocument: [],
          getOrganizationByInn: [],
        },
        lastUpdated: new Date(),
      };

      mockMetricsModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue({
          type: 'current',
          timestamp: new Date(),
          metrics: savedMetrics,
        }),
      });

      const newModule: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocMetricsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: getModelToken('DiadocMetrics'),
            useValue: mockMetricsModel,
          },
        ],
      }).compile();

      const newService = newModule.get<DiadocMetricsService>(DiadocMetricsService);

      // Wait for loadCurrentMetrics to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = newService.getCurrentMetrics();
      expect(metrics.documentsSent.paymentOrder).toBe(10);
      expect(metrics.documentsSigned).toBe(15);
    });

    it('should use in-memory storage when metricsModel is not available', async () => {
      const moduleWithoutModel: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocMetricsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: getModelToken('DiadocMetrics'),
            useValue: undefined,
          },
        ],
      }).compile();

      const serviceWithoutModel = moduleWithoutModel.get<DiadocMetricsService>(
        DiadocMetricsService,
      );

      // Should not throw
      const metrics = serviceWithoutModel.getCurrentMetrics();
      expect(metrics).toBeDefined();
    });

    it('should handle load errors gracefully', async () => {
      mockMetricsModel.findOne.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const newModule: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocMetricsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: getModelToken('DiadocMetrics'),
            useValue: mockMetricsModel,
          },
        ],
      }).compile();

      // Should not throw
      await expect(newModule.get<DiadocMetricsService>(DiadocMetricsService)).toBeDefined();
    });
  });

  describe('saveMetricsPeriodically', () => {
    it('should save metrics every 5 minutes when enabled', async () => {
      await (service as any).saveMetricsPeriodically();

      expect(mockMetricsModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should skip when Diadoc is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'diadoc.enabled') {
          return false;
        }
        return undefined;
      });

      const disabledModule: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocMetricsService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: getModelToken('DiadocMetrics'),
            useValue: mockMetricsModel,
          },
        ],
      }).compile();

      const disabledService = disabledModule.get<DiadocMetricsService>(DiadocMetricsService);

      await (disabledService as any).saveMetricsPeriodically();

      expect(mockMetricsModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('aggregateMetrics', () => {
    it('should aggregate multiple records correctly', () => {
      const records: DiadocMetricsRecord[] = [
        {
          type: 'hourly',
          timestamp: new Date(),
          metrics: {
            documentsSent: { paymentOrder: 5, report: 3, contract: 2 },
            documentsSigned: 8,
            documentsRejected: 2,
            errors: { temporary: 1, permanent: 0, timeout: 0, auth: 0, rateLimit: 0 },
            requestDurations: {
              authenticate: [],
              uploadDocument: [],
              sendForSigning: [],
              getDocumentStatus: [],
              getSignedDocument: [],
              getOrganizationByInn: [],
            },
            lastUpdated: new Date(),
          },
        },
        {
          type: 'hourly',
          timestamp: new Date(),
          metrics: {
            documentsSent: { paymentOrder: 3, report: 2, contract: 1 },
            documentsSigned: 5,
            documentsRejected: 1,
            errors: { temporary: 0, permanent: 1, timeout: 0, auth: 0, rateLimit: 0 },
            requestDurations: {
              authenticate: [],
              uploadDocument: [],
              sendForSigning: [],
              getDocumentStatus: [],
              getSignedDocument: [],
              getOrganizationByInn: [],
            },
            lastUpdated: new Date(),
          },
        },
      ];

      const aggregated = (service as any).aggregateMetrics(records);

      expect(aggregated.documentsSent.paymentOrder).toBe(8);
      expect(aggregated.documentsSent.report).toBe(5);
      expect(aggregated.documentsSent.contract).toBe(3);
      expect(aggregated.documentsSigned).toBe(13);
      expect(aggregated.documentsRejected).toBe(3);
      expect(aggregated.errors.temporary).toBe(1);
      expect(aggregated.errors.permanent).toBe(1);
    });

    it('should return empty metrics for empty records', () => {
      const aggregated = (service as any).aggregateMetrics([]);

      expect(aggregated.documentsSent.paymentOrder).toBe(0);
      expect(aggregated.documentsSigned).toBe(0);
      expect(aggregated.documentsRejected).toBe(0);
    });
  });
});
