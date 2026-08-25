import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { DiadocExpirationCheckerService } from './diadoc-expiration-checker.service';
import { FORM_PAYMENT_SERVICE } from '../../form-payment/form-payment.constants';
import { IFormPaymentService } from '../../form-payment/service/form-payment.service.interface';
import { IContractService } from '../../contract/service/contract.service.interface';
import { FormPayment } from '../../form-payment/service/form-payment.schema';
import { Contract } from '../../contract/service/contract.schema';
import { FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { ContractStatus } from '../../../lib/enums/models/contract.enums';
import { SenderFormPaymentEvents, SenderPattern } from '../../../lib/enums/models/sender.enums';
import { NatsClientProxy } from '../../../lib/modules/nats/nats-client-proxy';
import mongoose from 'mongoose';

describe('DiadocExpirationCheckerService', () => {
  let service: DiadocExpirationCheckerService;
  let mockFormPaymentService: jest.Mocked<IFormPaymentService>;
  let mockContractService: jest.Mocked<IContractService>;
  let mockFormPaymentModel: any;
  let mockContractModel: any;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockNatsClient: jest.Mocked<NatsClientProxy>;

  const mockAccountId = new mongoose.Types.ObjectId().toString();
  const mockFormPaymentId = new mongoose.Types.ObjectId().toString();
  const mockContractId = new mongoose.Types.ObjectId().toString();

  const createExpiredDate = (daysAgo: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date;
  };

  const mockFormPayment = {
    _id: mockFormPaymentId,
    account: mockAccountId,
    status: FormPaymentStatus.SIGNING_ORDER,
    docs: {
      paymentOrderIsDiadocSigning: true,
      paymentOrderDiadocSentAt: createExpiredDate(4), // 4 days ago
    },
    toObject: jest.fn().mockReturnThis(),
  };

  const mockFormPaymentWithReport = {
    _id: mockFormPaymentId,
    account: mockAccountId,
    status: FormPaymentStatus.REPORT_WAITING,
    docs: {
      reportIsDiadocSigning: true,
      reportDiadocSentAt: createExpiredDate(4), // 4 days ago
    },
    toObject: jest.fn().mockReturnThis(),
  };

  const mockContract = {
    _id: mockContractId,
    account: mockAccountId,
    status: ContractStatus.CREATED,
    isDiadocSigning: true,
    diadocSentAt: createExpiredDate(4), // 4 days ago
    toObject: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    mockFormPaymentService = {
      updateOne: jest.fn().mockResolvedValue({}),
    } as any;

    mockContractService = {
      updateOne: jest.fn().mockResolvedValue({}),
    } as any;

    mockFormPaymentModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    };

    mockContractModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
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

    mockNatsClient = {
      send: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiadocExpirationCheckerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
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
          provide: 'NatsClientProxy',
          useValue: mockNatsClient,
        },
      ],
    }).compile();

    service = module.get<DiadocExpirationCheckerService>(DiadocExpirationCheckerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkExpiredDocuments', () => {
    it('should skip check when Diadoc is disabled', async () => {
      const disabledConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'diadoc.enabled') {
            return false;
          }
          return undefined;
        }),
      };

      const disabledModule: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocExpirationCheckerService,
          {
            provide: ConfigService,
            useValue: disabledConfigService,
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
            provide: 'NatsClientProxy',
            useValue: mockNatsClient,
          },
        ],
      }).compile();

      const disabledService = disabledModule.get<DiadocExpirationCheckerService>(
        DiadocExpirationCheckerService,
      );

      await disabledService.checkExpiredDocuments();

      expect(mockFormPaymentModel.find).not.toHaveBeenCalled();
      expect(mockContractModel.find).not.toHaveBeenCalled();
    });

    it('should call all check methods when enabled', async () => {
      await service.checkExpiredDocuments();

      expect(mockFormPaymentModel.find).toHaveBeenCalled();
      expect(mockContractModel.find).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect(service.checkExpiredDocuments()).resolves.not.toThrow();
    });

    it('should log statistics after completion', async () => {
      const logSpy = jest.spyOn((service as any).logger, 'log');

      await service.checkExpiredDocuments();

      expect(logSpy).toHaveBeenCalledWith('Starting Diadoc document expiration check...');
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Diadoc expiration check completed'),
      );
    });

    it('should update lastRunTime', async () => {
      await service.checkExpiredDocuments();

      const stats = service.getStatistics();
      expect(stats.lastRunTime).toBeInstanceOf(Date);
    });
  });

  describe('checkExpiredPaymentOrders', () => {
    it('should find documents older than 3 days', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockFormPayment]),
        }),
      });

      await (service as any).checkExpiredPaymentOrders();

      expect(mockFormPaymentModel.find).toHaveBeenCalledWith({
        'docs.paymentOrderIsDiadocSigning': true,
        'docs.paymentOrderDiadocSentAt': { $lt: expect.any(Date) },
        status: { $nin: [
          FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
          FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
          FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
          FormPaymentStatus.COMPLETED,
        ] },
      });
    });

    it('should ignore already processed documents', async () => {
      // Documents with status in $nin array should not be found by query
      // So we verify that the query excludes these statuses
      await (service as any).checkExpiredPaymentOrders();

      // Verify that the query excludes already processed statuses
      expect(mockFormPaymentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $nin: [
            FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
            FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
            FormPaymentStatus.SIGNING_ORDER_ACCEPTED,
            FormPaymentStatus.COMPLETED,
          ] },
        }),
      );
    });

    it('should call handleExpiredPaymentOrder for each expired document', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockFormPayment]),
        }),
      });

      await (service as any).checkExpiredPaymentOrders();

      expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
        { _id: mockFormPaymentId },
        expect.objectContaining({
          status: FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
          prevStatus: FormPaymentStatus.SIGNING_ORDER,
          docs: expect.objectContaining({
            paymentOrderIsDiadocSigning: false,
          }),
          rejectText: expect.stringContaining('3 дней'),
        }),
      );
    });

    it('should limit documents to 100 per run', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      await (service as any).checkExpiredPaymentOrders();

      expect(mockFormPaymentModel.find().sort().limit).toHaveBeenCalledWith(100);
    });

    it('should handle errors for individual documents without stopping', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockFormPayment]),
        }),
      });

      mockFormPaymentService.updateOne.mockRejectedValueOnce(new Error('Update error'));

      await expect((service as any).checkExpiredPaymentOrders()).resolves.not.toThrow();
    });

    it('should return early when services are not available', async () => {
      const moduleWithoutServices: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocExpirationCheckerService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: FORM_PAYMENT_SERVICE, useValue: undefined },
          { provide: 'IContractService', useValue: undefined },
          { provide: getModelToken(FormPayment.name), useValue: undefined },
          { provide: getModelToken(Contract.name), useValue: undefined },
          { provide: 'NatsClientProxy', useValue: undefined },
        ],
      }).compile();

      const serviceWithoutServices = moduleWithoutServices.get<DiadocExpirationCheckerService>(
        DiadocExpirationCheckerService,
      );

      await (serviceWithoutServices as any).checkExpiredPaymentOrders();

      expect(mockFormPaymentModel.find).not.toHaveBeenCalled();
    });

    it('should sort by paymentOrderDiadocSentAt ascending', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      await (service as any).checkExpiredPaymentOrders();

      expect(mockFormPaymentModel.find().sort).toHaveBeenCalledWith({ 'docs.paymentOrderDiadocSentAt': 1 });
    });
  });

  describe('checkExpiredReports', () => {
    it('should find reports older than 3 days', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockFormPaymentWithReport]),
        }),
      });

      await (service as any).checkExpiredReports();

      // VF-2: Проверяем отчёты, исключая финальные статусы
      expect(mockFormPaymentModel.find).toHaveBeenCalledWith({
        'docs.reportIsDiadocSigning': true,
        'docs.reportDiadocSentAt': { $lt: expect.any(Date) },
        status: { $nin: [
          FormPaymentStatus.REPORT_WAITING_VERIFICATION,
          FormPaymentStatus.REPORT_WAITING_CORRECTIONS,
          FormPaymentStatus.REPORT_ACCEPTED,
          FormPaymentStatus.COMPLETED,
        ] },
      });
    });

    it('should call handleExpiredReport for each expired report', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockFormPaymentWithReport]),
        }),
      });

      await (service as any).checkExpiredReports();

      expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
        { _id: mockFormPaymentId },
        expect.objectContaining({
          docs: expect.objectContaining({
            reportIsDiadocSigning: false,
          }),
        }),
      );
    });

    it('should limit reports to 100 per run', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      await (service as any).checkExpiredReports();

      expect(mockFormPaymentModel.find().sort().limit).toHaveBeenCalledWith(100);
    });

    it('should handle errors gracefully', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect((service as any).checkExpiredReports()).resolves.not.toThrow();
    });
  });

  describe('checkExpiredContracts', () => {
    it('should find contracts older than 3 days', async () => {
      mockContractModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockContract]),
        }),
      });

      await (service as any).checkExpiredContracts();

      // VF-2: Проверяем договоры только в статусах WAITING_DIADOC и CREATED
      expect(mockContractModel.find).toHaveBeenCalledWith({
        isDiadocSigning: true,
        diadocSentAt: { $lt: expect.any(Date) },
        status: { $in: [
          ContractStatus.WAITING_DIADOC,
          ContractStatus.CREATED,
        ] },
      });
    });

    it('should call handleExpiredContract for each expired contract', async () => {
      mockContractModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockContract]),
        }),
      });

      await (service as any).checkExpiredContracts();

      expect(mockContractService.updateOne).toHaveBeenCalledWith(
        { _id: mockContractId },
        expect.objectContaining({
          status: ContractStatus.REJECTED,
          isDiadocSigning: false,
          rejectText: expect.stringContaining('3 дней'),
        }),
      );
    });

    it('should limit contracts to 100 per run', async () => {
      mockContractModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      await (service as any).checkExpiredContracts();

      expect(mockContractModel.find().sort().limit).toHaveBeenCalledWith(100);
    });

    it('should handle errors gracefully', async () => {
      mockContractModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('Database error')),
        }),
      });

      await expect((service as any).checkExpiredContracts()).resolves.not.toThrow();
    });
  });

  describe('handleExpiredPaymentOrder', () => {
    it('should update status to SIGNING_ORDER_WAITING_CORRECTIONS', async () => {
      await (service as any).handleExpiredPaymentOrder(mockFormPayment);

      expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
        { _id: mockFormPaymentId },
        expect.objectContaining({
          status: FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
          prevStatus: FormPaymentStatus.SIGNING_ORDER,
        }),
      );
    });

    it('should set paymentOrderIsDiadocSigning to false', async () => {
      await (service as any).handleExpiredPaymentOrder(mockFormPayment);

      expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
        { _id: mockFormPaymentId },
        expect.objectContaining({
          docs: expect.objectContaining({
            paymentOrderIsDiadocSigning: false,
          }),
        }),
      );
    });

    it('should set rejectText with expiration message', async () => {
      await (service as any).handleExpiredPaymentOrder(mockFormPayment);

      expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
        { _id: mockFormPaymentId },
        expect.objectContaining({
          rejectText: expect.stringContaining('3 дней'),
        }),
      );
    });

    it('should send notification via NATS', async () => {
      await (service as any).handleExpiredPaymentOrder(mockFormPayment);

      expect(mockNatsClient.send).toHaveBeenCalledWith(
        SenderPattern.SEND_USER,
        expect.objectContaining({
          type: SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED,
          account: mockAccountId,
          language: 'ru',
        }),
      );
    });

    it('should handle account as object with _id', async () => {
      const formPaymentWithObjectAccount = {
        ...mockFormPayment,
        account: { _id: mockAccountId },
      };

      await (service as any).handleExpiredPaymentOrder(formPaymentWithObjectAccount);

      expect(mockNatsClient.send).toHaveBeenCalledWith(
        SenderPattern.SEND_USER,
        expect.objectContaining({
          account: mockAccountId,
        }),
      );
    });

    it('should skip notification if NatsClient is not available', async () => {
      const moduleWithoutNats: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocExpirationCheckerService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: FORM_PAYMENT_SERVICE, useValue: mockFormPaymentService },
          { provide: 'IContractService', useValue: mockContractService },
          { provide: getModelToken(FormPayment.name), useValue: mockFormPaymentModel },
          { provide: getModelToken(Contract.name), useValue: mockContractModel },
          { provide: 'NatsClientProxy', useValue: undefined },
        ],
      }).compile();

      const serviceWithoutNats = moduleWithoutNats.get<DiadocExpirationCheckerService>(
        DiadocExpirationCheckerService,
      );

      await (serviceWithoutNats as any).handleExpiredPaymentOrder(mockFormPayment);

      expect(mockFormPaymentService.updateOne).toHaveBeenCalled();
    });

    it('should skip notification if account is not found', async () => {
      const formPaymentWithoutAccount = {
        ...mockFormPayment,
        account: undefined,
      };

      await (service as any).handleExpiredPaymentOrder(formPaymentWithoutAccount);

      expect(mockFormPaymentService.updateOne).toHaveBeenCalled();
      expect(mockNatsClient.send).not.toHaveBeenCalled();
    });
  });

  describe('handleExpiredReport', () => {
    it('should update reportIsDiadocSigning to false', async () => {
      await (service as any).handleExpiredReport(mockFormPaymentWithReport);

      expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
        { _id: mockFormPaymentId },
        expect.objectContaining({
          docs: expect.objectContaining({
            reportIsDiadocSigning: false,
          }),
        }),
      );
    });

    it('should send notification via NATS', async () => {
      await (service as any).handleExpiredReport(mockFormPaymentWithReport);

      expect(mockNatsClient.send).toHaveBeenCalledWith(
        SenderPattern.SEND_USER,
        expect.objectContaining({
          type: SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED,
          account: mockAccountId,
        }),
      );
    });
  });

  describe('handleExpiredContract', () => {
    it('should update status to REJECTED', async () => {
      await (service as any).handleExpiredContract(mockContract);

      expect(mockContractService.updateOne).toHaveBeenCalledWith(
        { _id: mockContractId },
        expect.objectContaining({
          status: ContractStatus.REJECTED,
          isDiadocSigning: false,
        }),
      );
    });

    it('should set rejectText with expiration message', async () => {
      await (service as any).handleExpiredContract(mockContract);

      expect(mockContractService.updateOne).toHaveBeenCalledWith(
        { _id: mockContractId },
        expect.objectContaining({
          rejectText: expect.stringContaining('3 дней'),
        }),
      );
    });

    it('should send notification via NATS', async () => {
      await (service as any).handleExpiredContract(mockContract);

      expect(mockNatsClient.send).toHaveBeenCalledWith(
        SenderPattern.SEND_USER,
        expect.objectContaining({
          type: SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED,
          account: mockAccountId,
        }),
      );
    });
  });

  describe('getExpirationDate', () => {
    it('should return date 3 days ago', () => {
      const expirationDate = (service as any).getExpirationDate();
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 3);

      // Allow 1 second difference for execution time
      const diff = Math.abs(expirationDate.getTime() - expectedDate.getTime());
      expect(diff).toBeLessThan(1000);
    });
  });

  describe('forceCheck', () => {
    it('should return counts of processed documents', async () => {
      mockFormPaymentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockFormPayment]),
        }),
      });

      mockContractModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([mockContract]),
        }),
      });

      const result = await service.forceCheck();

      expect(result).toEqual({
        expiredPaymentOrders: expect.any(Number),
        expiredReports: expect.any(Number),
        expiredContracts: expect.any(Number),
      });
    });

    it('should return zero counts when no documents found', async () => {
      const result = await service.forceCheck();

      expect(result).toEqual({
        expiredPaymentOrders: 0,
        expiredReports: 0,
        expiredContracts: 0,
      });
    });
  });

  describe('getStatistics', () => {
    it('should return current statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toHaveProperty('expiredPaymentOrdersCount');
      expect(stats).toHaveProperty('expiredReportsCount');
      expect(stats).toHaveProperty('expiredContractsCount');
      expect(stats).toHaveProperty('lastRunTime');
      expect(typeof stats.expiredPaymentOrdersCount).toBe('number');
      expect(typeof stats.expiredReportsCount).toBe('number');
      expect(typeof stats.expiredContractsCount).toBe('number');
      expect(stats.lastRunTime === null || stats.lastRunTime instanceof Date).toBe(true);
    });

    it('should return null lastRunTime before first run', async () => {
      const newModule: TestingModule = await Test.createTestingModule({
        providers: [
          DiadocExpirationCheckerService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: FORM_PAYMENT_SERVICE, useValue: mockFormPaymentService },
          { provide: 'IContractService', useValue: mockContractService },
          { provide: getModelToken(FormPayment.name), useValue: mockFormPaymentModel },
          { provide: getModelToken(Contract.name), useValue: mockContractModel },
          { provide: 'NatsClientProxy', useValue: mockNatsClient },
        ],
      }).compile();

      const newService = newModule.get<DiadocExpirationCheckerService>(
        DiadocExpirationCheckerService,
      );

      const stats = newService.getStatistics();
      expect(stats.lastRunTime).toBeNull();
    });
  });

  describe('sendNotificationToUser', () => {
    it('should send notification with correct payload', async () => {
      await (service as any).sendNotificationToUser(mockFormPayment, SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED);

      expect(mockNatsClient.send).toHaveBeenCalledWith(
        SenderPattern.SEND_USER,
        expect.objectContaining({
          type: SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED,
          account: mockAccountId,
          data: expect.objectContaining({
            _id: mockFormPaymentId,
          }),
          language: 'ru',
        }),
      );
    });

    it('should handle notification errors gracefully', async () => {
      mockNatsClient.send.mockRejectedValueOnce(new Error('NATS error'));

      await expect(
        (service as any).sendNotificationToUser(mockFormPayment, SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED),
      ).resolves.not.toThrow();
    });
  });

  describe('sendContractNotificationToUser', () => {
    it('should send notification with correct payload', async () => {
      await (service as any).sendContractNotificationToUser(mockContract, SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED);

      expect(mockNatsClient.send).toHaveBeenCalledWith(
        SenderPattern.SEND_USER,
        expect.objectContaining({
          type: SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED,
          account: mockAccountId,
          data: expect.objectContaining({
            _id: mockContractId,
          }),
          language: 'ru',
        }),
      );
    });

    it('should handle notification errors gracefully', async () => {
      mockNatsClient.send.mockRejectedValueOnce(new Error('NATS error'));

      await expect(
        (service as any).sendContractNotificationToUser(mockContract, SenderFormPaymentEvents.DIADOC_SIGNING_EXPIRED),
      ).resolves.not.toThrow();
    });
  });
});
