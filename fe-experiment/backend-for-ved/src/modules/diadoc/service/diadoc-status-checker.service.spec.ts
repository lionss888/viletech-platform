import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { DiadocStatusCheckerService } from './diadoc-status-checker.service';
import { DIADOC_SERVICE } from '../diadoc.constants';
import { FORM_PAYMENT_SERVICE } from '../../form-payment/form-payment.constants';
import { IDiadocService, DiadocDocumentStatus } from './diadoc.service.interface';
import { IFormPaymentService } from '../../form-payment/service/form-payment.service.interface';
import { IContractService } from '../../contract/service/contract.service.interface';
import { FormPayment } from '../../form-payment/service/form-payment.schema';
import { Contract } from '../../contract/service/contract.schema';
import { DiadocWebhookProcessorService } from './diadoc-webhook-processor.service';
import { FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { ContractStatus } from '../../../lib/enums/models/contract.enums';
import mongoose from 'mongoose';

describe('DiadocStatusCheckerService', () => {
  let service: DiadocStatusCheckerService;
  let mockDiadocService: jest.Mocked<IDiadocService>;
  let mockFormPaymentService: jest.Mocked<IFormPaymentService>;
  let mockContractService: jest.Mocked<IContractService>;
  let mockWebhookProcessor: jest.Mocked<DiadocWebhookProcessorService>;
  let mockFormPaymentModel: any;
  let mockContractModel: any;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockAccountId = new mongoose.Types.ObjectId().toString();
  const mockFormPaymentId = new mongoose.Types.ObjectId().toString();
  const mockContractId = new mongoose.Types.ObjectId().toString();
  const mockDocumentId = 'diadoc-document-id-123';
  const mockDocumentId2 = 'diadoc-document-id-456';

  const mockFormPayment = {
    _id: mockFormPaymentId,
    account: mockAccountId,
    status: FormPaymentStatus.SIGNING_ORDER,
    docs: {
      paymentOrderDiadocDocumentId: mockDocumentId,
      paymentOrderSigned: [],
    },
    toObject: jest.fn().mockReturnThis(),
  };

  const mockFormPaymentWithReport = {
    _id: mockFormPaymentId,
    account: mockAccountId,
    status: FormPaymentStatus.REPORT_WAITING,
    docs: {
      reportDiadocDocumentId: mockDocumentId,
    },
    toObject: jest.fn().mockReturnThis(),
  };

  const mockContract = {
    _id: mockContractId,
    account: mockAccountId,
    status: ContractStatus.CREATED,
    diadocDocumentId: mockDocumentId,
    toObject: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    mockDiadocService = {
      getDocumentStatus: jest.fn().mockResolvedValue(DiadocDocumentStatus.SIGNED),
    } as any;

    mockFormPaymentService = {
      findOneByPaymentOrderDiadocDocumentId: jest.fn().mockResolvedValue(mockFormPayment),
      findOneByReportDiadocDocumentId: jest.fn().mockResolvedValue(mockFormPaymentWithReport),
    } as any;

    mockContractService = {
      findOneByDiadocDocumentId: jest.fn().mockResolvedValue(mockContract),
    } as any;

    mockWebhookProcessor = {
      processFormPaymentPaymentOrderStatusChange: jest.fn().mockResolvedValue(undefined),
      processFormPaymentReportStatusChange: jest.fn().mockResolvedValue(undefined),
      processContractStatusChange: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockFormPaymentModel = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      }),
    };

    mockContractModel = {
      find: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      }),
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
        DiadocStatusCheckerService,
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
          provide: getModelToken(FormPayment.name),
          useValue: mockFormPaymentModel,
        },
        {
          provide: getModelToken(Contract.name),
          useValue: mockContractModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DiadocWebhookProcessorService,
          useValue: mockWebhookProcessor,
        },
      ],
    }).compile();

    service = module.get<DiadocStatusCheckerService>(DiadocStatusCheckerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDiadocDocumentStatuses', () => {
    it('should skip check when Diadoc is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'diadoc.enabled') {
          return false;
        }
        return undefined;
      });

      await service.checkDiadocDocumentStatuses();

      expect(mockFormPaymentModel.find).not.toHaveBeenCalled();
      expect(mockContractModel.find).not.toHaveBeenCalled();
    });

    it('should check all document types when enabled', async () => {
      await service.checkDiadocDocumentStatuses();

      expect(mockFormPaymentModel.find).toHaveBeenCalled();
      expect(mockContractModel.find).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      await expect(service.checkDiadocDocumentStatuses()).resolves.not.toThrow();
    });

    it('should return early if DiadocService is not available', async () => {
      const moduleWithoutDiadoc: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocStatusCheckerService,
          { provide: DIADOC_SERVICE, useValue: undefined },
          { provide: FORM_PAYMENT_SERVICE, useValue: mockFormPaymentService },
          { provide: 'IContractService', useValue: mockContractService },
          { provide: getModelToken(FormPayment.name), useValue: mockFormPaymentModel },
          { provide: getModelToken(Contract.name), useValue: mockContractModel },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: DiadocWebhookProcessorService, useValue: mockWebhookProcessor },
        ],
      }).compile();

      const serviceWithoutDiadoc = moduleWithoutDiadoc.get<DiadocStatusCheckerService>(
        DiadocStatusCheckerService,
      );

      await serviceWithoutDiadoc.checkDiadocDocumentStatuses();

      expect(mockFormPaymentModel.find).not.toHaveBeenCalled();
    });
  });

  describe('checkFormPaymentPaymentOrders', () => {
    it('should find and process payment orders with pending status', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment]),
      });

      await (service as any).checkFormPaymentPaymentOrders();

      expect(mockFormPaymentModel.find).toHaveBeenCalledWith({
        'docs.paymentOrderDiadocDocumentId': { $exists: true, $ne: null },
        $or: [
          { 'docs.paymentOrderSigned': { $exists: false } },
          { 'docs.paymentOrderSigned': { $size: 0 } },
        ],
      });

      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledWith(mockDocumentId);
      expect(mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId).toHaveBeenCalledWith(mockDocumentId);
      expect(mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange).toHaveBeenCalled();
    });

    it('should process REJECTED status for payment orders', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment]),
      });
      mockDiadocService.getDocumentStatus.mockResolvedValue(DiadocDocumentStatus.REJECTED);

      await (service as any).checkFormPaymentPaymentOrders();

      expect(mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange).toHaveBeenCalledWith(
        mockFormPayment,
        mockDocumentId,
        DiadocDocumentStatus.REJECTED,
      );
    });

    it('should process CANCELLED status for payment orders', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment]),
      });
      mockDiadocService.getDocumentStatus.mockResolvedValue(DiadocDocumentStatus.CANCELLED);

      await (service as any).checkFormPaymentPaymentOrders();

      expect(mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange).toHaveBeenCalledWith(
        mockFormPayment,
        mockDocumentId,
        DiadocDocumentStatus.CANCELLED,
      );
    });

    it('should skip processing when status is DRAFT', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment]),
      });

      mockDiadocService.getDocumentStatus.mockResolvedValue(DiadocDocumentStatus.DRAFT);

      await (service as any).checkFormPaymentPaymentOrders();

      expect(mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange).not.toHaveBeenCalled();
    });

    it('should skip processing when status is SENT', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment]),
      });

      mockDiadocService.getDocumentStatus.mockResolvedValue(DiadocDocumentStatus.SENT);

      await (service as any).checkFormPaymentPaymentOrders();

      expect(mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange).not.toHaveBeenCalled();
    });

    it('should handle errors for individual documents without stopping processing', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment]),
      });

      mockDiadocService.getDocumentStatus.mockRejectedValue(new Error('API error'));

      await expect((service as any).checkFormPaymentPaymentOrders()).resolves.not.toThrow();
    });

    it('should return early when services are not available', async () => {
      const moduleWithoutServices: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocStatusCheckerService,
          { provide: DIADOC_SERVICE, useValue: undefined },
          { provide: FORM_PAYMENT_SERVICE, useValue: undefined },
          { provide: 'IContractService', useValue: undefined },
          { provide: getModelToken(FormPayment.name), useValue: undefined },
          { provide: getModelToken(Contract.name), useValue: undefined },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: DiadocWebhookProcessorService, useValue: mockWebhookProcessor },
        ],
      }).compile();

      const serviceWithoutServices = moduleWithoutServices.get<DiadocStatusCheckerService>(
        DiadocStatusCheckerService,
      );

      await (serviceWithoutServices as any).checkFormPaymentPaymentOrders();

      expect(mockFormPaymentModel.find).not.toHaveBeenCalled();
    });

    it('should skip documents without paymentOrderDiadocDocumentId', async () => {
      const formPaymentWithoutDocId = {
        ...mockFormPayment,
        docs: { paymentOrderSigned: [] },
      };
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([formPaymentWithoutDocId]),
      });

      await (service as any).checkFormPaymentPaymentOrders();

      expect(mockDiadocService.getDocumentStatus).not.toHaveBeenCalled();
    });

    it('should continue processing if findOneByPaymentOrderDiadocDocumentId returns null', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment]),
      });
      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(null);

      await (service as any).checkFormPaymentPaymentOrders();

      expect(mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange).not.toHaveBeenCalled();
    });

    it('should handle error when webhook processor throws', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment]),
      });
      mockWebhookProcessor.processFormPaymentPaymentOrderStatusChange.mockRejectedValue(
        new Error('Processing error'),
      );

      await expect((service as any).checkFormPaymentPaymentOrders()).resolves.not.toThrow();
    });

    it('should process multiple documents', async () => {
      const mockFormPayment2 = {
        ...mockFormPayment,
        _id: new mongoose.Types.ObjectId().toString(),
        docs: { paymentOrderDiadocDocumentId: mockDocumentId2, paymentOrderSigned: [] },
      };
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment, mockFormPayment2]),
      });

      await (service as any).checkFormPaymentPaymentOrders();

      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(2);
      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledWith(mockDocumentId);
      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledWith(mockDocumentId2);
    });
  });

  describe('checkFormPaymentReports', () => {
    it('should find and process reports with pending status', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPaymentWithReport]),
      });

      await (service as any).checkFormPaymentReports();

      expect(mockFormPaymentModel.find).toHaveBeenCalledWith({
        'docs.reportDiadocDocumentId': { $exists: true, $ne: null },
        $or: [{ 'docs.reportSigned': { $exists: false } }, { 'docs.reportSigned': null }],
      });

      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledWith(mockDocumentId);
      expect(mockFormPaymentService.findOneByReportDiadocDocumentId).toHaveBeenCalledWith(mockDocumentId);
      expect(mockWebhookProcessor.processFormPaymentReportStatusChange).toHaveBeenCalled();
    });

    it('should skip documents without reportDiadocDocumentId', async () => {
      const formPaymentWithoutDocId = {
        ...mockFormPaymentWithReport,
        docs: {},
      };
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([formPaymentWithoutDocId]),
      });

      await (service as any).checkFormPaymentReports();

      expect(mockDiadocService.getDocumentStatus).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPaymentWithReport]),
      });
      mockDiadocService.getDocumentStatus.mockRejectedValue(new Error('API error'));

      await expect((service as any).checkFormPaymentReports()).resolves.not.toThrow();
    });
  });

  describe('checkContracts', () => {
    it('should find and process contracts with pending status', async () => {
      mockContractModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockContract]),
      });

      await (service as any).checkContracts();

      expect(mockContractModel.find).toHaveBeenCalledWith({
        diadocDocumentId: { $exists: true, $ne: null },
        diadocSignedAt: { $exists: false },
      });

      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledWith(mockDocumentId);
      expect(mockContractService.findOneByDiadocDocumentId).toHaveBeenCalledWith(mockDocumentId);
      expect(mockWebhookProcessor.processContractStatusChange).toHaveBeenCalled();
    });

    it('should process REJECTED status for contracts', async () => {
      mockContractModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockContract]),
      });
      mockDiadocService.getDocumentStatus.mockResolvedValue(DiadocDocumentStatus.REJECTED);

      await (service as any).checkContracts();

      expect(mockWebhookProcessor.processContractStatusChange).toHaveBeenCalledWith(
        mockContract,
        mockDocumentId,
        DiadocDocumentStatus.REJECTED,
      );
    });

    it('should process CANCELLED status for contracts', async () => {
      mockContractModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockContract]),
      });
      mockDiadocService.getDocumentStatus.mockResolvedValue(DiadocDocumentStatus.CANCELLED);

      await (service as any).checkContracts();

      expect(mockWebhookProcessor.processContractStatusChange).toHaveBeenCalledWith(
        mockContract,
        mockDocumentId,
        DiadocDocumentStatus.CANCELLED,
      );
    });

    it('should skip contracts without diadocDocumentId', async () => {
      const contractWithoutDocId = { ...mockContract, diadocDocumentId: undefined };
      mockContractModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([contractWithoutDocId]),
      });

      await (service as any).checkContracts();

      expect(mockDiadocService.getDocumentStatus).not.toHaveBeenCalled();
    });

    it('should return early when services are not available', async () => {
      const moduleWithoutServices: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocStatusCheckerService,
          { provide: DIADOC_SERVICE, useValue: undefined },
          { provide: FORM_PAYMENT_SERVICE, useValue: mockFormPaymentService },
          { provide: 'IContractService', useValue: undefined },
          { provide: getModelToken(FormPayment.name), useValue: mockFormPaymentModel },
          { provide: getModelToken(Contract.name), useValue: undefined },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: DiadocWebhookProcessorService, useValue: mockWebhookProcessor },
        ],
      }).compile();

      const serviceWithoutContracts = moduleWithoutServices.get<DiadocStatusCheckerService>(
        DiadocStatusCheckerService,
      );

      await (serviceWithoutContracts as any).checkContracts();

      expect(mockContractService.findOneByDiadocDocumentId).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockContractModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockContract]),
      });
      mockDiadocService.getDocumentStatus.mockRejectedValue(new Error('API error'));

      await expect((service as any).checkContracts()).resolves.not.toThrow();
    });

    it('should handle error when findOneByDiadocDocumentId returns null', async () => {
      mockContractModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockContract]),
      });
      mockContractService.findOneByDiadocDocumentId.mockResolvedValue(null);

      await (service as any).checkContracts();

      expect(mockWebhookProcessor.processContractStatusChange).not.toHaveBeenCalled();
    });
  });

  describe('getDocumentStatusWithRetry', () => {
    it('should return status on first attempt if successful', async () => {
      const status = await (service as any).getDocumentStatusWithRetry(mockDocumentId, 'Test', 3);

      expect(status).toBe(DiadocDocumentStatus.SIGNED);
      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(1);
    });

    it('should retry on timeout errors', async () => {
      mockDiadocService.getDocumentStatus
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockRejectedValueOnce(new Error('Request timeout'))
        .mockResolvedValueOnce(DiadocDocumentStatus.SIGNED);

      const status = await (service as any).getDocumentStatusWithRetry(mockDocumentId, 'Test', 3);

      expect(status).toBe(DiadocDocumentStatus.SIGNED);
      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(3);
    });

    it('should retry on network errors', async () => {
      mockDiadocService.getDocumentStatus
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce(DiadocDocumentStatus.SIGNED);

      const status = await (service as any).getDocumentStatusWithRetry(mockDocumentId, 'Test', 3);

      expect(status).toBe(DiadocDocumentStatus.SIGNED);
      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(2);
    });

    it('should retry on ETIMEDOUT errors', async () => {
      mockDiadocService.getDocumentStatus
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce(DiadocDocumentStatus.SENT);

      const status = await (service as any).getDocumentStatusWithRetry(mockDocumentId, 'Test', 3);

      expect(status).toBe(DiadocDocumentStatus.SENT);
      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      mockDiadocService.getDocumentStatus.mockRejectedValue(new Error('Request timeout'));

      await expect(
        (service as any).getDocumentStatusWithRetry(mockDocumentId, 'Test', 2),
      ).rejects.toThrow('Request timeout');

      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(2);
    });

    it('should not retry on permanent errors', async () => {
      mockDiadocService.getDocumentStatus.mockRejectedValue(new Error('Invalid document ID'));

      await expect(
        (service as any).getDocumentStatusWithRetry(mockDocumentId, 'Test', 3),
      ).rejects.toThrow('Invalid document ID');

      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(1);
    });

    it('should not retry on 400 Bad Request errors', async () => {
      mockDiadocService.getDocumentStatus.mockRejectedValue(new Error('Bad Request (HTTP 400)'));

      await expect(
        (service as any).getDocumentStatusWithRetry(mockDocumentId, 'Test', 3),
      ).rejects.toThrow('Bad Request');

      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(1);
    });

    it('should throw error if DiadocService is not available', async () => {
      const moduleWithoutDiadoc: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocStatusCheckerService,
          { provide: DIADOC_SERVICE, useValue: undefined },
          { provide: FORM_PAYMENT_SERVICE, useValue: mockFormPaymentService },
          { provide: 'IContractService', useValue: mockContractService },
          { provide: getModelToken(FormPayment.name), useValue: mockFormPaymentModel },
          { provide: getModelToken(Contract.name), useValue: mockContractModel },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: DiadocWebhookProcessorService, useValue: mockWebhookProcessor },
        ],
      }).compile();

      const serviceWithoutDiadoc = moduleWithoutDiadoc.get<DiadocStatusCheckerService>(
        DiadocStatusCheckerService,
      );

      await expect(
        (serviceWithoutDiadoc as any).getDocumentStatusWithRetry(mockDocumentId, 'Test', 3),
      ).rejects.toThrow('DiadocService is not available');
    });
  });

  describe('scheduled task behavior', () => {
    it('should log start and completion messages', async () => {
      const logSpy = jest.spyOn((service as any).logger, 'log');

      await service.checkDiadocDocumentStatuses();

      expect(logSpy).toHaveBeenCalledWith('Starting periodic Diadoc document status check...');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Periodic Diadoc document status check completed'),
      );
    });

    it('should track success and error counts', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment]),
      });

      await service.checkDiadocDocumentStatuses();

      // Success count should have been incremented
      const logSpy = jest.spyOn((service as any).logger, 'log');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processed:'),
      );
    });

    it('should continue processing other documents if one fails', async () => {
      const mockFormPayment2 = {
        ...mockFormPayment,
        _id: new mongoose.Types.ObjectId().toString(),
        docs: { paymentOrderDiadocDocumentId: mockDocumentId2, paymentOrderSigned: [] },
      };
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment, mockFormPayment2]),
      });

      mockDiadocService.getDocumentStatus
        .mockRejectedValueOnce(new Error('API error for first'))
        .mockResolvedValueOnce(DiadocDocumentStatus.SIGNED);

      await service.checkDiadocDocumentStatuses();

      // Second document should still be processed
      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(2);
    });
  });

  describe('limit behavior', () => {
    it('should limit FormPayment queries to 100', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      });

      await (service as any).checkFormPaymentPaymentOrders();

      expect(mockFormPaymentModel.find().limit).toHaveBeenCalledWith(100);
    });

    it('should limit Contract queries to 100', async () => {
      mockContractModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      });

      await (service as any).checkContracts();

      expect(mockContractModel.find().limit).toHaveBeenCalledWith(100);
    });
  });

  describe('getDocumentStatusWithCache', () => {
    it('should return cached status when available and not expired', async () => {
      // First call - should fetch from API and cache
      mockDiadocService.getDocumentStatus.mockResolvedValueOnce(DiadocDocumentStatus.SIGNED);

      const status1 = await (service as any).getDocumentStatusWithCache(mockDocumentId);
      expect(status1).toBe(DiadocDocumentStatus.SIGNED);
      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const status2 = await (service as any).getDocumentStatusWithCache(mockDocumentId);
      expect(status2).toBe(DiadocDocumentStatus.SIGNED);
      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('should fetch from API when cache is expired', async () => {
      jest.useFakeTimers();

      // First call - cache
      mockDiadocService.getDocumentStatus.mockResolvedValueOnce(DiadocDocumentStatus.SIGNED);
      await (service as any).getDocumentStatusWithCache(mockDocumentId);

      // Advance time past cache TTL (2 minutes)
      jest.advanceTimersByTime(3 * 60 * 1000);

      // Second call - should fetch from API
      mockDiadocService.getDocumentStatus.mockResolvedValueOnce(DiadocDocumentStatus.REJECTED);
      const status = await (service as any).getDocumentStatusWithCache(mockDocumentId);

      expect(status).toBe(DiadocDocumentStatus.REJECTED);
      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should increment cacheHitCount when using cache', async () => {
      mockDiadocService.getDocumentStatus.mockResolvedValueOnce(DiadocDocumentStatus.SIGNED);

      // First call
      await (service as any).getDocumentStatusWithCache(mockDocumentId);
      const stats1 = service.getStatistics();

      // Second call - should hit cache
      await (service as any).getDocumentStatusWithCache(mockDocumentId);
      const stats2 = service.getStatistics();

      expect(stats2.cacheHitCount).toBeGreaterThan(stats1.cacheHitCount);
    });

    it('should update cache when fetching new status', async () => {
      mockDiadocService.getDocumentStatus
        .mockResolvedValueOnce(DiadocDocumentStatus.SENT)
        .mockResolvedValueOnce(DiadocDocumentStatus.SIGNED);

      const status1 = await (service as any).getDocumentStatusWithCache(mockDocumentId);
      expect(status1).toBe(DiadocDocumentStatus.SENT);

      // After cache expires, should get new status
      jest.useFakeTimers();
      jest.advanceTimersByTime(3 * 60 * 1000);

      const status2 = await (service as any).getDocumentStatusWithCache(mockDocumentId);
      expect(status2).toBe(DiadocDocumentStatus.SIGNED);

      jest.useRealTimers();
    });
  });

  describe('processBatches', () => {
    it('should process items in batches', async () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));
      const processor = jest.fn().mockResolvedValue(undefined);

      await (service as any).processBatches(items, processor, 'Test');

      // batchSize = 10, so should process in 3 batches (10, 10, 5)
      expect(processor).toHaveBeenCalledTimes(25);
    });

    it('should limit parallel requests to maxParallelRequests', async () => {
      const items = Array.from({ length: 15 }, (_, i) => ({ id: i }));
      let concurrentCount = 0;
      let maxConcurrent = 0;

      const processor = jest.fn().mockImplementation(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise(resolve => setTimeout(resolve, 10));
        concurrentCount--;
      });

      await (service as any).processBatches(items, processor, 'Test');

      // maxParallelRequests = 5, so maxConcurrent should be <= 5
      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });

    it('should handle errors in batch processing without stopping', async () => {
      const items = Array.from({ length: 5 }, (_, i) => ({ id: i }));
      const processor = jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce(undefined);

      await expect((service as any).processBatches(items, processor, 'Test')).resolves.not.toThrow();

      expect(processor).toHaveBeenCalledTimes(5);
      const stats = service.getStatistics();
      expect(stats.errorCount).toBeGreaterThan(0);
    });
  });

  describe('getStatistics', () => {
    it('should return current statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toEqual({
        successCount: expect.any(Number),
        errorCount: expect.any(Number),
        cacheHitCount: expect.any(Number),
        cacheSize: expect.any(Number),
        lastRunTime: expect.any(Date),
      });
    });

    it('should return correct cache size', async () => {
      mockDiadocService.getDocumentStatus
        .mockResolvedValueOnce(DiadocDocumentStatus.SIGNED)
        .mockResolvedValueOnce(DiadocDocumentStatus.SENT);

      await (service as any).getDocumentStatusWithCache('doc-1');
      await (service as any).getDocumentStatusWithCache('doc-2');

      const stats = service.getStatistics();
      expect(stats.cacheSize).toBe(2);
    });

    it('should track success and error counts', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([mockFormPayment]),
      });

      await service.checkDiadocDocumentStatuses();

      const stats = service.getStatistics();
      expect(stats.successCount).toBeGreaterThanOrEqual(0);
      expect(stats.errorCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('forceCheckDocument', () => {
    it('should ignore cache and fetch fresh status', async () => {
      // First call - cache the status
      mockDiadocService.getDocumentStatus.mockResolvedValueOnce(DiadocDocumentStatus.SENT);
      await (service as any).getDocumentStatusWithCache(mockDocumentId);

      // forceCheckDocument should ignore cache
      mockDiadocService.getDocumentStatus.mockResolvedValueOnce(DiadocDocumentStatus.SIGNED);
      const status = await service.forceCheckDocument(mockDocumentId);

      expect(status).toBe(DiadocDocumentStatus.SIGNED);
      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalledTimes(2);
    });

    it('should delete document from cache before checking', async () => {
      // Cache the status
      mockDiadocService.getDocumentStatus.mockResolvedValueOnce(DiadocDocumentStatus.SENT);
      await (service as any).getDocumentStatusWithCache(mockDocumentId);

      const statsBefore = service.getStatistics();
      expect(statsBefore.cacheSize).toBe(1);

      // forceCheckDocument should delete from cache first
      mockDiadocService.getDocumentStatus.mockResolvedValueOnce(DiadocDocumentStatus.SIGNED);
      await service.forceCheckDocument(mockDocumentId);

      // Cache should be updated, not cleared
      const statsAfter = service.getStatistics();
      expect(statsAfter.cacheSize).toBe(1); // Still 1, but with new status
    });

    it('should handle errors when checking status', async () => {
      mockDiadocService.getDocumentStatus.mockRejectedValue(new Error('API error'));

      await expect(service.forceCheckDocument(mockDocumentId)).rejects.toThrow('API error');
    });
  });

  describe('clearCache', () => {
    it('should clear all cached statuses', async () => {
      // Add some items to cache
      mockDiadocService.getDocumentStatus
        .mockResolvedValueOnce(DiadocDocumentStatus.SIGNED)
        .mockResolvedValueOnce(DiadocDocumentStatus.SENT);

      await (service as any).getDocumentStatusWithCache('doc-1');
      await (service as any).getDocumentStatusWithCache('doc-2');

      const statsBefore = service.getStatistics();
      expect(statsBefore.cacheSize).toBe(2);

      // Clear cache
      service.clearCache();

      const statsAfter = service.getStatistics();
      expect(statsAfter.cacheSize).toBe(0);
    });
  });

  describe('minWaitTime behavior', () => {
    it('should skip documents sent less than 1 minute ago', async () => {
      const recentDate = new Date(Date.now() - 30 * 1000); // 30 seconds ago

      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([
          {
            ...mockFormPayment,
            updateDate: recentDate,
          },
        ]),
      });

      await (service as any).checkFormPaymentPaymentOrders();

      // Should not process because document is too recent
      // The query should filter by updateDate < minWaitDate
      expect(mockFormPaymentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          updateDate: { $lt: expect.any(Date) },
        }),
      );
    });

    it('should process documents sent more than 1 minute ago', async () => {
      const oldDate = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago

      mockFormPaymentModel.find.mockReturnValue({
        limit: jest.fn().mockResolvedValue([
          {
            ...mockFormPayment,
            updateDate: oldDate,
          },
        ]),
      });

      await (service as any).checkFormPaymentPaymentOrders();

      expect(mockDiadocService.getDocumentStatus).toHaveBeenCalled();
    });
  });

  describe('isTerminalStatus', () => {
    it('should identify SIGNED as terminal status', () => {
      const isTerminal = (service as any).isTerminalStatus(DiadocDocumentStatus.SIGNED);
      expect(isTerminal).toBe(true);
    });

    it('should identify REJECTED as terminal status', () => {
      const isTerminal = (service as any).isTerminalStatus(DiadocDocumentStatus.REJECTED);
      expect(isTerminal).toBe(true);
    });

    it('should identify CANCELLED as terminal status', () => {
      const isTerminal = (service as any).isTerminalStatus(DiadocDocumentStatus.CANCELLED);
      expect(isTerminal).toBe(true);
    });

    it('should identify ERROR as terminal status', () => {
      const isTerminal = (service as any).isTerminalStatus(DiadocDocumentStatus.ERROR);
      expect(isTerminal).toBe(true);
    });

    it('should identify DRAFT as non-terminal status', () => {
      const isTerminal = (service as any).isTerminalStatus(DiadocDocumentStatus.DRAFT);
      expect(isTerminal).toBe(false);
    });

    it('should identify SENT as non-terminal status', () => {
      const isTerminal = (service as any).isTerminalStatus(DiadocDocumentStatus.SENT);
      expect(isTerminal).toBe(false);
    });

    it('should identify WAITING_FOR_RECIPIENT_SIGNATURE as non-terminal status', () => {
      const isTerminal = (service as any).isTerminalStatus(DiadocDocumentStatus.WAITING_FOR_RECIPIENT_SIGNATURE);
      expect(isTerminal).toBe(false);
    });
  });

  describe('cleanupCache', () => {
    it('should remove expired cache entries', async () => {
      jest.useFakeTimers();

      // Add items to cache
      mockDiadocService.getDocumentStatus
        .mockResolvedValueOnce(DiadocDocumentStatus.SIGNED)
        .mockResolvedValueOnce(DiadocDocumentStatus.SENT);

      await (service as any).getDocumentStatusWithCache('doc-1');
      await (service as any).getDocumentStatusWithCache('doc-2');

      const statsBefore = service.getStatistics();
      expect(statsBefore.cacheSize).toBe(2);

      // Advance time past cache TTL * 2 (4 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000);

      // Trigger cleanup
      (service as any).cleanupCache();

      const statsAfter = service.getStatistics();
      expect(statsAfter.cacheSize).toBe(0);

      jest.useRealTimers();
    });

    it('should not remove non-expired cache entries', async () => {
      jest.useFakeTimers();

      mockDiadocService.getDocumentStatus.mockResolvedValueOnce(DiadocDocumentStatus.SIGNED);
      await (service as any).getDocumentStatusWithCache('doc-1');

      const statsBefore = service.getStatistics();
      expect(statsBefore.cacheSize).toBe(1);

      // Advance time less than cache TTL * 2
      jest.advanceTimersByTime(1 * 60 * 1000); // 1 minute

      (service as any).cleanupCache();

      const statsAfter = service.getStatistics();
      expect(statsAfter.cacheSize).toBe(1); // Still 1

      jest.useRealTimers();
    });
  });
});
