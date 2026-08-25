import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DiadocController } from './diadoc.controller';
import { DIADOC_SERVICE } from '../diadoc.constants';
import { FORM_PAYMENT_SERVICE } from '../../form-payment/form-payment.constants';
import { FILE_SERVICE } from '../../file/file.constants';
import { IDiadocService, DiadocDocumentStatus, DiadocHealthStatus, DiadocMetrics } from '../service/diadoc.service.interface';
import { IFormPaymentService } from '../../form-payment/service/form-payment.service.interface';
import { IContractService } from '../../contract/service/contract.service.interface';
import { IFileService } from '../../file/service/file.service.interface';
import { DiadocWebhookProcessorService } from '../service/diadoc-webhook-processor.service';
import { DiadocMetricsService } from '../service/diadoc-metrics.service';
import { DiadocStatusCheckerService } from '../service/diadoc-status-checker.service';
import { DiadocWebhookGuard } from '../guards/diadoc-webhook.guard';
import { FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { ContractStatus } from '../../../lib/enums/models/contract.enums';
import mongoose from 'mongoose';

describe('DiadocController', () => {
  let controller: DiadocController;
  let mockDiadocService: jest.Mocked<IDiadocService>;
  let mockFormPaymentService: jest.Mocked<IFormPaymentService>;
  let mockContractService: jest.Mocked<IContractService>;
  let mockFileService: jest.Mocked<IFileService>;
  let mockWebhookProcessor: jest.Mocked<DiadocWebhookProcessorService>;

  const mockAccountId = new mongoose.Types.ObjectId().toString();
  const mockFormPaymentId = new mongoose.Types.ObjectId().toString();
  const mockContractId = new mongoose.Types.ObjectId().toString();
  const mockFileId = new mongoose.Types.ObjectId().toString();
  const mockSignedFileId = new mongoose.Types.ObjectId().toString();
  const mockDocumentId = 'diadoc-document-id-123';
  const mockSignedDocumentBuffer = Buffer.from('signed-document-content');

  const mockFormPayment = {
    _id: mockFormPaymentId,
    account: mockAccountId,
    status: FormPaymentStatus.SIGNING_ORDER,
    uid: 12345,
    docs: {
      paymentOrder: mockFileId,
      paymentOrderDiadocDocumentId: mockDocumentId,
    },
  };

  const mockFormPaymentWithReport = {
    ...mockFormPayment,
    docs: {
      ...mockFormPayment.docs,
      report: mockFileId,
      reportDiadocDocumentId: mockDocumentId,
    },
  };

  const mockContract = {
    _id: mockContractId,
    account: mockAccountId,
    status: ContractStatus.CREATED,
    file: mockFileId,
    diadocDocumentId: mockDocumentId,
  };

  const mockFile = {
    _id: mockFileId,
    originalName: 'test-document.pdf',
    mimeType: 'application/pdf',
  };

  const mockSignedFile = {
    _id: mockSignedFileId,
    originalName: 'test-document-signed.pdf',
    mimeType: 'application/pdf',
  };

  let mockMetricsService: jest.Mocked<DiadocMetricsService>;
  let mockStatusCheckerService: jest.Mocked<DiadocStatusCheckerService>;

  beforeEach(async () => {
    mockDiadocService = {
      getSignedDocument: jest.fn().mockResolvedValue(mockSignedDocumentBuffer),
      getDocumentStatus: jest.fn().mockResolvedValue(DiadocDocumentStatus.SIGNED),
      checkHealth: jest.fn().mockResolvedValue({
        enabled: true,
        configured: true,
        apiReachable: true,
        authenticated: true,
        lastCheck: new Date(),
      } as DiadocHealthStatus),
      getMetrics: jest.fn().mockReturnValue({
        documentsSent: { paymentOrder: 0, report: 0, contract: 0 },
        documentsSigned: 0,
        documentsRejected: 0,
        errors: { temporary: 0, permanent: 0, timeout: 0, auth: 0, rateLimit: 0 },
        requestDurations: {
          authenticate: [],
          uploadDocument: [],
          sendForSigning: [],
          getDocumentStatus: [],
          getSignedDocument: [],
          getOrganizationByInn: [],
        },
        lastUpdated: new Date(),
      } as DiadocMetrics),
      getAverageRequestDuration: jest.fn().mockReturnValue(0),
    } as any;

    mockFormPaymentService = {
      findOneByPaymentOrderDiadocDocumentId: jest.fn().mockResolvedValue(null),
      findOneByReportDiadocDocumentId: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue(mockFormPayment),
    } as any;

    mockContractService = {
      findOneByDiadocDocumentId: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue(mockContract),
    } as any;

    mockFileService = {
      baseUpload: jest.fn().mockResolvedValue(mockSignedFile),
      findOne: jest.fn().mockResolvedValue(mockFile),
      findOneOrException: jest.fn().mockResolvedValue(mockFile),
    } as any;

    mockWebhookProcessor = {
      processFormPaymentPaymentOrderStatusChange: jest.fn().mockResolvedValue(undefined),
      processFormPaymentReportStatusChange: jest.fn().mockResolvedValue(undefined),
      processContractStatusChange: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockMetricsService = {
      getCurrentMetrics: jest.fn().mockReturnValue({
        documentsSent: { paymentOrder: 0, report: 0, contract: 0 },
        documentsSigned: 0,
        documentsRejected: 0,
        errors: { temporary: 0, permanent: 0, timeout: 0, auth: 0, rateLimit: 0 },
        requestDurations: {
          authenticate: [],
          uploadDocument: [],
          sendForSigning: [],
          getDocumentStatus: [],
          getSignedDocument: [],
          getOrganizationByInn: [],
        },
        lastUpdated: new Date(),
      }),
      resetCurrentMetrics: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockStatusCheckerService = {
      getStatistics: jest.fn().mockReturnValue({
        successCount: 10,
        errorCount: 2,
        cacheHitCount: 5,
        cacheSize: 3,
        lastRunTime: new Date(),
      }),
      clearCache: jest.fn().mockReturnValue(undefined),
      forceCheckDocument: jest.fn().mockResolvedValue(DiadocDocumentStatus.SIGNED),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiadocController],
      providers: [
        {
          provide: DiadocWebhookProcessorService,
          useValue: mockWebhookProcessor,
        },
        {
          provide: DIADOC_SERVICE,
          useValue: mockDiadocService,
        },
        {
          provide: FORM_PAYMENT_SERVICE,
          useValue: mockFormPaymentService,
        },
        {
          provide: 'IContractService',
          useValue: mockContractService,
        },
        {
          provide: FILE_SERVICE,
          useValue: mockFileService,
        },
        {
          provide: DiadocMetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: DiadocStatusCheckerService,
          useValue: mockStatusCheckerService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              enabled: true,
              webhook: {
                validatePayload: false, // Skip validation in tests
              },
            }),
          },
        },
        DiadocWebhookGuard,
      ],
    }).compile();

    controller = module.get<DiadocController>(DiadocController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWebhook - FormPayment Payment Order', () => {
    it('should successfully handle SIGNED status for payment order', async () => {
      const payload = {
        documentId: mockDocumentId,
        status: DiadocDocumentStatus.SIGNED,
      };

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(
        mockFormPayment as any,
      );

      await controller.handleWebhook(payload);

      expect(mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId).toHaveBeenCalledWith(
        mockDocumentId,
      );
      expect(mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange).toHaveBeenCalledWith(
        mockFormPayment,
        mockDocumentId,
        DiadocDocumentStatus.SIGNED,
      );
    });

    it('should handle REJECTED status for payment order', async () => {
      const payload = {
        documentId: mockDocumentId,
        status: DiadocDocumentStatus.REJECTED,
      };

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(
        mockFormPayment as any,
      );

      await controller.handleWebhook(payload);

      expect(mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange).toHaveBeenCalledWith(
        mockFormPayment,
        mockDocumentId,
        DiadocDocumentStatus.REJECTED,
      );
    });

    it('should handle CANCELLED status for payment order', async () => {
      const payload = {
        documentId: mockDocumentId,
        status: DiadocDocumentStatus.CANCELLED,
      };

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(
        mockFormPayment as any,
      );

      await controller.handleWebhook(payload);

      expect(mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange).toHaveBeenCalledWith(
        mockFormPayment,
        mockDocumentId,
        DiadocDocumentStatus.CANCELLED,
      );
    });
  });

  describe('handleWebhook - FormPayment Report', () => {
    it('should successfully handle SIGNED status for report', async () => {
      const payload = {
        documentId: mockDocumentId,
        status: DiadocDocumentStatus.SIGNED,
      };

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(null);
      mockFormPaymentService.findOneByReportDiadocDocumentId.mockResolvedValue(
        mockFormPaymentWithReport as any,
      );

      await controller.handleWebhook(payload);

      expect(mockFormPaymentService.findOneByReportDiadocDocumentId).toHaveBeenCalledWith(
        mockDocumentId,
      );
      expect(mockWebhookProcessor.processFormPaymentReportStatusChange).toHaveBeenCalledWith(
        mockFormPaymentWithReport,
        mockDocumentId,
        DiadocDocumentStatus.SIGNED,
      );
    });
  });

  describe('handleWebhook - Contract', () => {
    it('should successfully handle SIGNED status for contract', async () => {
      const payload = {
        documentId: mockDocumentId,
        status: DiadocDocumentStatus.SIGNED,
      };

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(null);
      mockFormPaymentService.findOneByReportDiadocDocumentId.mockResolvedValue(null);
      mockContractService.findOneByDiadocDocumentId.mockResolvedValue(mockContract as any);

      await controller.handleWebhook(payload);

      expect(mockContractService.findOneByDiadocDocumentId).toHaveBeenCalledWith(mockDocumentId);
      expect(mockWebhookProcessor.processContractStatusChange).toHaveBeenCalledWith(
        mockContract,
        mockDocumentId,
        DiadocDocumentStatus.SIGNED,
      );
    });

    it('should handle REJECTED status for contract', async () => {
      const payload = {
        documentId: mockDocumentId,
        status: DiadocDocumentStatus.REJECTED,
      };

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(null);
      mockFormPaymentService.findOneByReportDiadocDocumentId.mockResolvedValue(null);
      mockContractService.findOneByDiadocDocumentId.mockResolvedValue(mockContract as any);

      await controller.handleWebhook(payload);

      expect(mockWebhookProcessor.processContractStatusChange).toHaveBeenCalledWith(
        mockContract,
        mockDocumentId,
        DiadocDocumentStatus.REJECTED,
      );
    });

    it('should handle CANCELLED status for contract', async () => {
      const payload = {
        documentId: mockDocumentId,
        status: DiadocDocumentStatus.CANCELLED,
      };

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(null);
      mockFormPaymentService.findOneByReportDiadocDocumentId.mockResolvedValue(null);
      mockContractService.findOneByDiadocDocumentId.mockResolvedValue(mockContract as any);

      await controller.handleWebhook(payload);

      expect(mockWebhookProcessor.processContractStatusChange).toHaveBeenCalledWith(
        mockContract,
        mockDocumentId,
        DiadocDocumentStatus.CANCELLED,
      );
    });
  });

  describe('handleWebhook - Edge Cases', () => {
    it('should log warning when document not found', async () => {
      const payload = {
        documentId: 'unknown-document-id',
        status: DiadocDocumentStatus.SIGNED,
      };

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(null);
      mockFormPaymentService.findOneByReportDiadocDocumentId.mockResolvedValue(null);
      mockContractService.findOneByDiadocDocumentId.mockResolvedValue(null);

      // Should not throw error, just log warning
      await expect(controller.handleWebhook(payload)).resolves.not.toThrow();

      expect(mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange).not.toHaveBeenCalled();
      expect(mockWebhookProcessor.processFormPaymentReportStatusChange).not.toHaveBeenCalled();
      expect(mockWebhookProcessor.processContractStatusChange).not.toHaveBeenCalled();
    });

    it('should handle error when webhook processor fails', async () => {
      const payload = {
        documentId: mockDocumentId,
        status: DiadocDocumentStatus.SIGNED,
      };

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(
        mockFormPayment as any,
      );
      mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange.mockRejectedValue(
        new Error('Failed to process webhook'),
      );

      // Should throw error as controller doesn't catch errors from webhookProcessor
      await expect(controller.handleWebhook(payload)).rejects.toThrow('Failed to process webhook');
    });
  });

  describe('checkHealth', () => {
    it('should call diadocService.checkHealth and return status', async () => {
      const healthStatus: DiadocHealthStatus = {
        enabled: true,
        configured: true,
        apiReachable: true,
        authenticated: true,
        lastCheck: new Date(),
      };

      mockDiadocService.checkHealth.mockResolvedValue(healthStatus);

      const result = await controller.checkHealth();

      expect(mockDiadocService.checkHealth).toHaveBeenCalled();
      expect(result).toEqual(healthStatus);
    });

    it('should return status when Diadoc is disabled', async () => {
      const healthStatus: DiadocHealthStatus = {
        enabled: false,
        configured: false,
        apiReachable: false,
        authenticated: false,
        lastCheck: new Date(),
        error: 'Diadoc integration is disabled',
      };

      mockDiadocService.checkHealth.mockResolvedValue(healthStatus);

      const result = await controller.checkHealth();

      expect(result.enabled).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should return status when API is unreachable', async () => {
      const healthStatus: DiadocHealthStatus = {
        enabled: true,
        configured: true,
        apiReachable: false,
        authenticated: false,
        lastCheck: new Date(),
        error: 'Connection refused',
      };

      mockDiadocService.checkHealth.mockResolvedValue(healthStatus);

      const result = await controller.checkHealth();

      expect(result.apiReachable).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('getMetrics', () => {
    it('should return current metrics from metricsService when available', async () => {
      const result = await controller.getMetrics();

      expect(mockMetricsService.getCurrentMetrics).toHaveBeenCalled();
      expect(result.current).toBeDefined();
      expect(result.averageRequestDurations).toBeDefined();
    });

    it('should return metrics from diadocService when metricsService is not available', async () => {
      const moduleWithoutMetrics: TestingModule = await Test.createTestingModule({
        controllers: [DiadocController],
        providers: [
          {
            provide: DiadocWebhookProcessorService,
            useValue: mockWebhookProcessor,
          },
          {
            provide: DIADOC_SERVICE,
            useValue: mockDiadocService,
          },
          {
            provide: FORM_PAYMENT_SERVICE,
            useValue: mockFormPaymentService,
          },
          {
            provide: 'IContractService',
            useValue: mockContractService,
          },
          {
            provide: FILE_SERVICE,
            useValue: mockFileService,
          },
          {
            provide: DiadocMetricsService,
            useValue: undefined,
          },
          {
            provide: DiadocStatusCheckerService,
            useValue: undefined,
          },
        ],
      }).compile();

      const controllerWithoutMetrics = moduleWithoutMetrics.get<DiadocController>(DiadocController);

      const result = await controllerWithoutMetrics.getMetrics();

      expect(mockDiadocService.getMetrics).toHaveBeenCalled();
      expect(result.current).toBeDefined();
    });

    it('should return average request durations for all methods', async () => {
      mockDiadocService.getAverageRequestDuration
        .mockReturnValueOnce(100) // authenticate
        .mockReturnValueOnce(200) // uploadDocument
        .mockReturnValueOnce(150) // sendForSigning
        .mockReturnValueOnce(80) // getDocumentStatus
        .mockReturnValueOnce(120) // getSignedDocument
        .mockReturnValueOnce(90); // getOrganizationByInn

      const result = await controller.getMetrics();

      expect(result.averageRequestDurations).toEqual({
        authenticate: 100,
        uploadDocument: 200,
        sendForSigning: 150,
        getDocumentStatus: 80,
        getSignedDocument: 120,
        getOrganizationByInn: 90,
      });
    });

    it('should include statusChecker statistics when available', async () => {
      const result = await controller.getMetrics();

      expect(result.statusChecker).toEqual({
        successCount: 10,
        errorCount: 2,
        cacheHitCount: 5,
        cacheSize: 3,
        lastRunTime: expect.any(Date),
      });
    });

    it('should not include statusChecker when service is not available', async () => {
      const moduleWithoutStatusChecker: TestingModule = await Test.createTestingModule({
        controllers: [DiadocController],
        providers: [
          {
            provide: DiadocWebhookProcessorService,
            useValue: mockWebhookProcessor,
          },
          {
            provide: DIADOC_SERVICE,
            useValue: mockDiadocService,
          },
          {
            provide: FORM_PAYMENT_SERVICE,
            useValue: mockFormPaymentService,
          },
          {
            provide: 'IContractService',
            useValue: mockContractService,
          },
          {
            provide: FILE_SERVICE,
            useValue: mockFileService,
          },
          {
            provide: DiadocMetricsService,
            useValue: mockMetricsService,
          },
          {
            provide: DiadocStatusCheckerService,
            useValue: undefined,
          },
        ],
      }).compile();

      const controllerWithoutStatusChecker = moduleWithoutStatusChecker.get<DiadocController>(DiadocController);

      const result = await controllerWithoutStatusChecker.getMetrics();

      expect(result.statusChecker).toBeUndefined();
    });
  });

  describe('resetMetrics', () => {
    it('should reset metrics in metricsService when available', async () => {
      const result = await controller.resetMetrics();

      expect(mockMetricsService.resetCurrentMetrics).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should clear cache in statusCheckerService when available', async () => {
      const result = await controller.resetMetrics();

      expect(mockStatusCheckerService.clearCache).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should work when metricsService is not available', async () => {
      const moduleWithoutMetrics: TestingModule = await Test.createTestingModule({
        controllers: [DiadocController],
        providers: [
          {
            provide: DiadocWebhookProcessorService,
            useValue: mockWebhookProcessor,
          },
          {
            provide: DIADOC_SERVICE,
            useValue: mockDiadocService,
          },
          {
            provide: FORM_PAYMENT_SERVICE,
            useValue: mockFormPaymentService,
          },
          {
            provide: 'IContractService',
            useValue: mockContractService,
          },
          {
            provide: FILE_SERVICE,
            useValue: mockFileService,
          },
          {
            provide: DiadocMetricsService,
            useValue: undefined,
          },
          {
            provide: DiadocStatusCheckerService,
            useValue: mockStatusCheckerService,
          },
        ],
      }).compile();

      const controllerWithoutMetrics = moduleWithoutMetrics.get<DiadocController>(DiadocController);

      const result = await controllerWithoutMetrics.resetMetrics();

      expect(result.success).toBe(true);
    });

    it('should work when statusCheckerService is not available', async () => {
      const moduleWithoutStatusChecker: TestingModule = await Test.createTestingModule({
        controllers: [DiadocController],
        providers: [
          {
            provide: DiadocWebhookProcessorService,
            useValue: mockWebhookProcessor,
          },
          {
            provide: DIADOC_SERVICE,
            useValue: mockDiadocService,
          },
          {
            provide: FORM_PAYMENT_SERVICE,
            useValue: mockFormPaymentService,
          },
          {
            provide: 'IContractService',
            useValue: mockContractService,
          },
          {
            provide: FILE_SERVICE,
            useValue: mockFileService,
          },
          {
            provide: DiadocMetricsService,
            useValue: mockMetricsService,
          },
          {
            provide: DiadocStatusCheckerService,
            useValue: undefined,
          },
        ],
      }).compile();

      const controllerWithoutStatusChecker = moduleWithoutStatusChecker.get<DiadocController>(DiadocController);

      const result = await controllerWithoutStatusChecker.resetMetrics();

      expect(result.success).toBe(true);
    });
  });

  describe('checkDocumentStatus', () => {
    it('should use statusCheckerService.forceCheckDocument when available', async () => {
      const body = { documentId: mockDocumentId };

      const result = await controller.checkDocumentStatus(body);

      expect(mockStatusCheckerService.forceCheckDocument).toHaveBeenCalledWith(mockDocumentId);
      expect(result.documentId).toBe(mockDocumentId);
      expect(result.status).toBe(DiadocDocumentStatus.SIGNED);
      expect(result.checkedAt).toBeInstanceOf(Date);
    });

    it('should fallback to diadocService.getDocumentStatus when statusCheckerService is not available', async () => {
      const moduleWithoutStatusChecker: TestingModule = await Test.createTestingModule({
        controllers: [DiadocController],
        providers: [
          {
            provide: DiadocWebhookProcessorService,
            useValue: mockWebhookProcessor,
          },
          {
            provide: DIADOC_SERVICE,
            useValue: mockDiadocService,
          },
          {
            provide: FORM_PAYMENT_SERVICE,
            useValue: mockFormPaymentService,
          },
          {
            provide: 'IContractService',
            useValue: mockContractService,
          },
          {
            provide: FILE_SERVICE,
            useValue: mockFileService,
          },
          {
            provide: DiadocMetricsService,
            useValue: mockMetricsService,
          },
          {
            provide: DiadocStatusCheckerService,
            useValue: undefined,
          },
        ],
      }).compile();

      const controllerWithoutStatusChecker = moduleWithoutStatusChecker.get<DiadocController>(DiadocController);

      const body = { documentId: mockDocumentId };
      const result = await controllerWithoutStatusChecker.checkDocumentStatus(body);

      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledWith(mockDocumentId);
      expect(result.documentId).toBe(mockDocumentId);
      expect(result.status).toBe(DiadocDocumentStatus.SIGNED);
    });

    it('should throw error when documentId is missing', async () => {
      const body = { documentId: '' };

      await expect(controller.checkDocumentStatus(body)).rejects.toThrow('documentId is required');
    });

    it('should throw error when documentId is not provided', async () => {
      const body = {} as any;

      await expect(controller.checkDocumentStatus(body)).rejects.toThrow('documentId is required');
    });

    it('should return checkedAt timestamp', async () => {
      const body = { documentId: mockDocumentId };
      const beforeCall = new Date();

      const result = await controller.checkDocumentStatus(body);

      const afterCall = new Date();
      expect(result.checkedAt.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(result.checkedAt.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });
  });

  describe('DTO validation', () => {
    it('should accept valid DiadocWebhookDto', async () => {
      const payload = {
        documentId: 'test-document-id',
        status: DiadocDocumentStatus.SIGNED,
      };

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(
        mockFormPayment as any,
      );

      await expect(controller.handleWebhook(payload)).resolves.not.toThrow();
    });

    it('should accept DiadocWebhookDto with optional fields', async () => {
      const payload = {
        documentId: 'test-document-id',
        status: DiadocDocumentStatus.SIGNED,
        messageId: 'test-message-id',
        timestamp: '2025-01-15T10:30:00Z',
        entityId: 'test-entity-id',
      };

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(
        mockFormPayment as any,
      );

      await expect(controller.handleWebhook(payload)).resolves.not.toThrow();
    });

    it('should require documentId field', async () => {
      const payload = {
        status: DiadocDocumentStatus.SIGNED,
        // documentId missing
      } as any;

      // Note: Validation happens at NestJS level, so this test verifies the structure
      // In real scenario, class-validator would reject this
      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(null);
      mockFormPaymentService.findOneByReportDiadocDocumentId.mockResolvedValue(null);
      mockContractService.findOneByDiadocDocumentId.mockResolvedValue(null);

      // Should not throw, but return success: false
      const result = await controller.handleWebhook(payload);
      expect(result.success).toBe(false);
    });

    it('should require status field', async () => {
      const payload = {
        documentId: 'test-document-id',
        // status missing
      } as any;

      // Note: Validation happens at NestJS level
      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(null);
      mockFormPaymentService.findOneByReportDiadocDocumentId.mockResolvedValue(null);
      mockContractService.findOneByDiadocDocumentId.mockResolvedValue(null);

      const result = await controller.handleWebhook(payload);
      expect(result.success).toBe(false);
    });
  });
});

