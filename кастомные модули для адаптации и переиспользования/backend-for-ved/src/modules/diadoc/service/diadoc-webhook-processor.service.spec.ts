import { Test, TestingModule } from '@nestjs/testing';
import { DiadocWebhookProcessorService } from './diadoc-webhook-processor.service';
import { DIADOC_SERVICE } from '../diadoc.constants';
import { FORM_PAYMENT_SERVICE } from '../../form-payment/form-payment.constants';
import { FILE_SERVICE } from '../../file/file.constants';
import { IDiadocService, DiadocDocumentStatus } from './diadoc.service.interface';
import { IFormPaymentService } from '../../form-payment/service/form-payment.service.interface';
import { IContractService } from '../../contract/service/contract.service.interface';
import { IFileService } from '../../file/service/file.service.interface';
import { FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { ContractStatus } from '../../../lib/enums/models/contract.enums';
import mongoose from 'mongoose';

describe('DiadocWebhookProcessorService', () => {
  let service: DiadocWebhookProcessorService;
  let mockDiadocService: jest.Mocked<IDiadocService>;
  let mockFormPaymentService: jest.Mocked<IFormPaymentService>;
  let mockContractService: jest.Mocked<IContractService>;
  let mockFileService: jest.Mocked<IFileService>;

  const mockAccountId = new mongoose.Types.ObjectId().toString();
  const mockFormPaymentId = new mongoose.Types.ObjectId().toString();
  const mockContractId = new mongoose.Types.ObjectId().toString();
  const mockFileId = new mongoose.Types.ObjectId().toString();
  const mockSignedFileId = new mongoose.Types.ObjectId().toString();
  const mockDocumentId = 'diadoc-document-id-123';
  const mockSignedDocumentBuffer = Buffer.from('signed-document-content');

  const createMockFormPayment = (overrides = {}) => ({
    _id: mockFormPaymentId,
    account: mockAccountId,
    uid: 12345,
    status: FormPaymentStatus.SIGNING_ORDER,
    docs: {
      paymentOrder: mockFileId,
      paymentOrderDiadocDocumentId: mockDocumentId,
      paymentOrderSigned: [],
    },
    ...overrides,
  });

  const createMockFormPaymentWithReport = (overrides = {}) => ({
    _id: mockFormPaymentId,
    account: mockAccountId,
    uid: 12345,
    status: FormPaymentStatus.REPORT_WAITING,
    docs: {
      report: mockFileId,
      reportDiadocDocumentId: mockDocumentId,
    },
    ...overrides,
  });

  const createMockContract = (overrides = {}) => ({
    _id: mockContractId,
    account: mockAccountId,
    status: ContractStatus.CREATED,
    file: mockFileId,
    diadocDocumentId: mockDocumentId,
    ...overrides,
  });

  const mockFile = {
    _id: mockFileId,
    originalName: 'test-document.pdf',
    mimeType: 'application/pdf',
  };

  const mockSignedFile = {
    _id: mockSignedFileId,
    originalName: 'test-document-signed.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    private: false,
    createDate: new Date(),
    updateDate: new Date(),
  };

  beforeEach(async () => {
    mockDiadocService = {
      getSignedDocument: jest.fn().mockResolvedValue(mockSignedDocumentBuffer),
      getDocumentStatus: jest.fn().mockResolvedValue(DiadocDocumentStatus.SIGNED),
      recordDocumentSent: jest.fn(),
      recordDocumentSigned: jest.fn(),
      recordDocumentRejected: jest.fn(),
    } as any;

    mockFormPaymentService = {
      updateOne: jest.fn().mockResolvedValue({}),
    } as any;

    mockContractService = {
      updateOne: jest.fn().mockResolvedValue({}),
    } as any;

    mockFileService = {
      baseUpload: jest.fn().mockResolvedValue(mockSignedFile),
      findOne: jest.fn().mockResolvedValue(mockFile),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiadocWebhookProcessorService,
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
      ],
    }).compile();

    service = module.get<DiadocWebhookProcessorService>(DiadocWebhookProcessorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processFormPaymentPaymentOrderStatusChange', () => {
    describe('SIGNED status', () => {
      it('should download signed document and update formPayment on SIGNED status', async () => {
        const mockFormPayment = createMockFormPayment();

        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockDiadocService.getSignedDocument).toHaveBeenCalledWith(mockDocumentId);
        expect(mockFileService.baseUpload).toHaveBeenCalledWith(
          expect.objectContaining({
            account: mockAccountId,
            private: true,
            buffer: mockSignedDocumentBuffer,
          }),
        );
        expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
          { _id: mockFormPaymentId },
          expect.objectContaining({
            status: FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
            prevStatus: FormPaymentStatus.SIGNING_ORDER,
          }),
        );
        expect(mockDiadocService.recordDocumentSigned).toHaveBeenCalled();
      });

      it('should handle account as object with _id', async () => {
        const mockFormPayment = createMockFormPayment({
          account: { _id: mockAccountId },
        });

        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockFileService.baseUpload).toHaveBeenCalledWith(
          expect.objectContaining({
            account: mockAccountId,
          }),
        );
      });

      it('should skip processing if already processed (idempotency)', async () => {
        const mockFormPayment = createMockFormPayment({
          status: FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
          docs: {
            paymentOrder: mockFileId,
            paymentOrderDiadocDocumentId: mockDocumentId,
            paymentOrderSigned: [mockSignedFileId],
          },
        });

        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
        expect(mockFormPaymentService.updateOne).not.toHaveBeenCalled();
      });

      it('should return early if FileService is not available', async () => {
        const moduleWithoutFileService: TestingModule = await Test.createTestingModule({
          providers: [
            DiadocWebhookProcessorService,
            { provide: DIADOC_SERVICE, useValue: mockDiadocService },
            { provide: FORM_PAYMENT_SERVICE, useValue: mockFormPaymentService },
            { provide: 'IContractService', useValue: mockContractService },
            { provide: FILE_SERVICE, useValue: undefined },
          ],
        }).compile();

        const serviceWithoutFile = moduleWithoutFileService.get<DiadocWebhookProcessorService>(
          DiadocWebhookProcessorService,
        );

        const mockFormPayment = createMockFormPayment();

        await serviceWithoutFile.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
      });

      it('should return early if DiadocService is not available', async () => {
        const moduleWithoutDiadoc: TestingModule = await Test.createTestingModule({
          providers: [
            DiadocWebhookProcessorService,
            { provide: DIADOC_SERVICE, useValue: undefined },
            { provide: FORM_PAYMENT_SERVICE, useValue: mockFormPaymentService },
            { provide: 'IContractService', useValue: mockContractService },
            { provide: FILE_SERVICE, useValue: mockFileService },
          ],
        }).compile();

        const serviceWithoutDiadoc = moduleWithoutDiadoc.get<DiadocWebhookProcessorService>(
          DiadocWebhookProcessorService,
        );

        const mockFormPayment = createMockFormPayment();

        await serviceWithoutDiadoc.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockFileService.baseUpload).not.toHaveBeenCalled();
      });

      it('should return early if FormPaymentService is not available', async () => {
        const moduleWithoutFormPayment: TestingModule = await Test.createTestingModule({
          providers: [
            DiadocWebhookProcessorService,
            { provide: DIADOC_SERVICE, useValue: mockDiadocService },
            { provide: FORM_PAYMENT_SERVICE, useValue: undefined },
            { provide: 'IContractService', useValue: mockContractService },
            { provide: FILE_SERVICE, useValue: mockFileService },
          ],
        }).compile();

        const serviceWithoutFormPayment = moduleWithoutFormPayment.get<DiadocWebhookProcessorService>(
          DiadocWebhookProcessorService,
        );

        const mockFormPayment = createMockFormPayment();

        await serviceWithoutFormPayment.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
      });

      it('should return early if account is not found', async () => {
        const mockFormPayment = createMockFormPayment({
          account: undefined,
        });

        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockFileService.baseUpload).not.toHaveBeenCalled();
      });

      it('should throw error if getSignedDocument fails', async () => {
        mockDiadocService.getSignedDocument.mockRejectedValue(new Error('Failed to download'));
        const mockFormPayment = createMockFormPayment();

        await expect(
          service.processFormPaymentPaymentOrderStatusChange(
            mockFormPayment,
            mockDocumentId,
            DiadocDocumentStatus.SIGNED,
          ),
        ).rejects.toThrow('Failed to download');
      });

      it('should throw error if baseUpload fails', async () => {
        mockFileService.baseUpload.mockRejectedValue(new Error('Failed to save file'));
        const mockFormPayment = createMockFormPayment();

        await expect(
          service.processFormPaymentPaymentOrderStatusChange(
            mockFormPayment,
            mockDocumentId,
            DiadocDocumentStatus.SIGNED,
          ),
        ).rejects.toThrow('Failed to save file');
      });

      it('should handle error when getting original file info', async () => {
        mockFileService.findOne.mockRejectedValue(new Error('File not found'));
        const mockFormPayment = createMockFormPayment();

        // Should not throw, just log warning
        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockFileService.baseUpload).toHaveBeenCalled();
      });

      it('should use default file name if original file not found', async () => {
        mockFileService.findOne.mockResolvedValue(null);
        const mockFormPayment = createMockFormPayment();

        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockFileService.baseUpload).toHaveBeenCalledWith(
          expect.objectContaining({
            originalName: expect.stringContaining('payment-order-signed-'),
          }),
        );
      });

      it('should append signed files to existing paymentOrderSigned array', async () => {
        const existingSignedFileId = new mongoose.Types.ObjectId().toString();
        const mockFormPayment = createMockFormPayment({
          docs: {
            paymentOrder: mockFileId,
            paymentOrderDiadocDocumentId: mockDocumentId,
            paymentOrderSigned: [existingSignedFileId],
          },
        });

        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
          { _id: mockFormPaymentId },
          expect.objectContaining({
            docs: expect.objectContaining({
              paymentOrderSigned: expect.arrayContaining([existingSignedFileId, mockSignedFileId]),
            }),
          }),
        );
      });
    });

    describe('REJECTED status', () => {
      it('should update status to SIGNING_ORDER_WAITING_CORRECTIONS on REJECTED', async () => {
        const mockFormPayment = createMockFormPayment();

        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.REJECTED,
        );

        expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
          { _id: mockFormPaymentId },
          expect.objectContaining({
            status: FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
            prevStatus: FormPaymentStatus.SIGNING_ORDER,
          }),
        );
        expect(mockDiadocService.recordDocumentRejected).toHaveBeenCalled();
      });

      it('should skip processing if already rejected (idempotency)', async () => {
        const mockFormPayment = createMockFormPayment({
          status: FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
        });

        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.REJECTED,
        );

        expect(mockFormPaymentService.updateOne).not.toHaveBeenCalled();
      });
    });

    describe('CANCELLED status', () => {
      it('should update status on CANCELLED', async () => {
        const mockFormPayment = createMockFormPayment();

        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.CANCELLED,
        );

        expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
          { _id: mockFormPaymentId },
          expect.objectContaining({
            status: FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
          }),
        );
      });
    });

    describe('other statuses', () => {
      it('should not update anything for DRAFT status', async () => {
        const mockFormPayment = createMockFormPayment();

        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.DRAFT,
        );

        expect(mockFormPaymentService.updateOne).not.toHaveBeenCalled();
        expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
      });

      it('should not update anything for SENT status', async () => {
        const mockFormPayment = createMockFormPayment();

        await service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SENT,
        );

        expect(mockFormPaymentService.updateOne).not.toHaveBeenCalled();
        expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
      });
    });
  });

  describe('processFormPaymentReportStatusChange', () => {
    describe('SIGNED status', () => {
      it('should download signed document and update formPayment on SIGNED status', async () => {
        const mockFormPayment = createMockFormPaymentWithReport();

        await service.processFormPaymentReportStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockDiadocService.getSignedDocument).toHaveBeenCalledWith(mockDocumentId);
        expect(mockFileService.baseUpload).toHaveBeenCalled();
        expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
          { _id: mockFormPaymentId },
          expect.objectContaining({
            docs: expect.objectContaining({
              reportSigned: mockSignedFileId,
            }),
            status: FormPaymentStatus.REPORT_WAITING_VERIFICATION,
          }),
        );
        expect(mockDiadocService.recordDocumentSigned).toHaveBeenCalled();
      });

      it('should skip processing if already processed (idempotency)', async () => {
        const mockFormPayment = createMockFormPaymentWithReport({
          docs: {
            report: mockFileId,
            reportDiadocDocumentId: mockDocumentId,
            reportSigned: mockSignedFileId,
          },
        });

        await service.processFormPaymentReportStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
        expect(mockFormPaymentService.updateOne).not.toHaveBeenCalled();
      });

      it('should keep REPORT_ACCEPTED status for corporate payments', async () => {
        const mockFormPayment = createMockFormPaymentWithReport({
          status: FormPaymentStatus.REPORT_ACCEPTED,
        });

        await service.processFormPaymentReportStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
          { _id: mockFormPaymentId },
          expect.objectContaining({
            status: FormPaymentStatus.REPORT_ACCEPTED,
          }),
        );
      });

      it('should keep PAYMENT_SENT status mapping to REPORT_ACCEPTED', async () => {
        const mockFormPayment = createMockFormPaymentWithReport({
          status: FormPaymentStatus.PAYMENT_SENT,
        });

        await service.processFormPaymentReportStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
          { _id: mockFormPaymentId },
          expect.objectContaining({
            status: FormPaymentStatus.REPORT_ACCEPTED,
          }),
        );
      });
    });

    describe('CANCELLED status', () => {
      it('should not throw on CANCELLED status', async () => {
        const mockFormPayment = createMockFormPaymentWithReport();

        await expect(
          service.processFormPaymentReportStatusChange(
            mockFormPayment,
            mockDocumentId,
            DiadocDocumentStatus.CANCELLED,
          ),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('processContractStatusChange', () => {
    describe('SIGNED status', () => {
      it('should download signed document and update contract on SIGNED status', async () => {
        const mockContract = createMockContract();

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockDiadocService.getSignedDocument).toHaveBeenCalledWith(mockDocumentId);
        expect(mockFileService.baseUpload).toHaveBeenCalled();
        expect(mockContractService.updateOne).toHaveBeenCalledWith(
          { _id: mockContractId },
          expect.objectContaining({
            file: mockSignedFileId,
            status: ContractStatus.ACCEPTED,
            signatureType: 'diadoc',
            diadocSignedAt: expect.any(Date),
          }),
        );
        expect(mockDiadocService.recordDocumentSigned).toHaveBeenCalled();
      });

      it('should skip processing if already signed (idempotency - diadocSignedAt)', async () => {
        const mockContract = createMockContract({
          diadocSignedAt: new Date(),
        });

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
        expect(mockContractService.updateOne).not.toHaveBeenCalled();
      });

      it('should skip processing if already accepted (idempotency - status)', async () => {
        const mockContract = createMockContract({
          status: ContractStatus.ACCEPTED,
        });

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
        expect(mockContractService.updateOne).not.toHaveBeenCalled();
      });

      it('should return early if services not available', async () => {
        const moduleWithoutServices: TestingModule = await Test.createTestingModule({
          providers: [
            DiadocWebhookProcessorService,
            { provide: DIADOC_SERVICE, useValue: undefined },
            { provide: FORM_PAYMENT_SERVICE, useValue: mockFormPaymentService },
            { provide: 'IContractService', useValue: undefined },
            { provide: FILE_SERVICE, useValue: undefined },
          ],
        }).compile();

        const serviceWithoutServices = moduleWithoutServices.get<DiadocWebhookProcessorService>(
          DiadocWebhookProcessorService,
        );

        const mockContract = createMockContract();

        await serviceWithoutServices.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockContractService.updateOne).not.toHaveBeenCalled();
      });

      it('should return early if account is not found', async () => {
        const mockContract = createMockContract({
          account: undefined,
        });

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockFileService.baseUpload).not.toHaveBeenCalled();
      });
    });

    describe('REJECTED status', () => {
      it('should update status to REJECTED', async () => {
        const mockContract = createMockContract();

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.REJECTED,
        );

        expect(mockContractService.updateOne).toHaveBeenCalledWith(
          { _id: mockContractId },
          expect.objectContaining({
            status: ContractStatus.REJECTED,
          }),
        );
        expect(mockDiadocService.recordDocumentRejected).toHaveBeenCalled();
      });

      it('should skip processing if already rejected (idempotency)', async () => {
        const mockContract = createMockContract({
          status: ContractStatus.REJECTED,
        });

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.REJECTED,
        );

        expect(mockContractService.updateOne).not.toHaveBeenCalled();
      });
    });

    describe('CANCELLED status', () => {
      it('should update status to REJECTED on CANCELLED', async () => {
        const mockContract = createMockContract();

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.CANCELLED,
        );

        expect(mockContractService.updateOne).toHaveBeenCalledWith(
          { _id: mockContractId },
          expect.objectContaining({
            status: ContractStatus.REJECTED,
          }),
        );
      });
    });

    describe('other statuses', () => {
      it('should not update anything for DRAFT status', async () => {
        const mockContract = createMockContract();

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.DRAFT,
        );

        expect(mockContractService.updateOne).not.toHaveBeenCalled();
        expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
      });

      it('should not update anything for SENT status', async () => {
        const mockContract = createMockContract();

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.SENT,
        );

        expect(mockContractService.updateOne).not.toHaveBeenCalled();
        expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
      });
    });
  });

  describe('webhook payload validation', () => {
    it('should handle documentId as required field', async () => {
      const mockFormPayment = createMockFormPayment();

      await service.processFormPaymentPaymentOrderStatusChange(
        mockFormPayment,
        mockDocumentId,
        DiadocDocumentStatus.SIGNED,
      );

      expect(mockDiadocService.getSignedDocument).toHaveBeenCalledWith(mockDocumentId);
    });

    it('should handle all DiadocDocumentStatus values', async () => {
      const mockFormPayment = createMockFormPayment();
      
      const allStatuses = Object.values(DiadocDocumentStatus);
      
      for (const status of allStatuses) {
        jest.clearAllMocks();
        
        // Reset mocks for SIGNED status
        if (status === DiadocDocumentStatus.SIGNED) {
          mockDiadocService.getSignedDocument.mockResolvedValue(mockSignedDocumentBuffer);
          mockFileService.baseUpload.mockResolvedValue(mockSignedFile);
        }
        
        await expect(
          service.processFormPaymentPaymentOrderStatusChange(
            { ...mockFormPayment, status: FormPaymentStatus.SIGNING_ORDER },
            mockDocumentId,
            status,
          ),
        ).resolves.not.toThrow();
      }
    });
  });

  describe('error handling', () => {
    it('should propagate error from getSignedDocument', async () => {
      const mockFormPayment = createMockFormPayment();
      const error = new Error('API error');
      mockDiadocService.getSignedDocument.mockRejectedValue(error);

      await expect(
        service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        ),
      ).rejects.toThrow('API error');
    });

    it('should propagate error from fileService.baseUpload', async () => {
      const mockFormPayment = createMockFormPayment();
      const error = new Error('Storage error');
      mockFileService.baseUpload.mockRejectedValue(error);

      await expect(
        service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        ),
      ).rejects.toThrow('Storage error');
    });

    it('should propagate error from formPaymentService.updateOne', async () => {
      const mockFormPayment = createMockFormPayment();
      const error = new Error('Database error');
      mockFormPaymentService.updateOne.mockRejectedValue(error);

      await expect(
        service.processFormPaymentPaymentOrderStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        ),
      ).rejects.toThrow('Database error');
    });

    it('should propagate error from contractService.updateOne', async () => {
      const mockContract = createMockContract();
      const error = new Error('Database error');
      mockContractService.updateOne.mockRejectedValue(error);

      await expect(
        service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        ),
      ).rejects.toThrow('Database error');
    });
  });

  describe('duplicate event handling (idempotency)', () => {
    it('should be idempotent for payment order SIGNED events', async () => {
      const mockFormPayment = createMockFormPayment({
        status: FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
        docs: {
          paymentOrder: mockFileId,
          paymentOrderDiadocDocumentId: mockDocumentId,
          paymentOrderSigned: [mockSignedFileId],
        },
      });

      // Call twice
      await service.processFormPaymentPaymentOrderStatusChange(
        mockFormPayment,
        mockDocumentId,
        DiadocDocumentStatus.SIGNED,
      );
      await service.processFormPaymentPaymentOrderStatusChange(
        mockFormPayment,
        mockDocumentId,
        DiadocDocumentStatus.SIGNED,
      );

      expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
    });

    it('should be idempotent for payment order REJECTED events', async () => {
      const mockFormPayment = createMockFormPayment({
        status: FormPaymentStatus.SIGNING_ORDER_WAITING_CORRECTIONS,
      });

      await service.processFormPaymentPaymentOrderStatusChange(
        mockFormPayment,
        mockDocumentId,
        DiadocDocumentStatus.REJECTED,
      );

      expect(mockFormPaymentService.updateOne).not.toHaveBeenCalled();
    });

    it('should be idempotent for report SIGNED events', async () => {
      const mockFormPayment = createMockFormPaymentWithReport({
        docs: {
          report: mockFileId,
          reportDiadocDocumentId: mockDocumentId,
          reportSigned: mockSignedFileId,
        },
      });

      await service.processFormPaymentReportStatusChange(
        mockFormPayment,
        mockDocumentId,
        DiadocDocumentStatus.SIGNED,
      );

      expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
    });

    it('should be idempotent for contract SIGNED events', async () => {
      const mockContract = createMockContract({
        diadocSignedAt: new Date(),
        status: ContractStatus.ACCEPTED,
      });

      await service.processContractStatusChange(
        mockContract,
        mockDocumentId,
        DiadocDocumentStatus.SIGNED,
      );

      expect(mockDiadocService.getSignedDocument).not.toHaveBeenCalled();
    });

    it('should be idempotent for contract REJECTED events', async () => {
      const mockContract = createMockContract({
        status: ContractStatus.REJECTED,
      });

      await service.processContractStatusChange(
        mockContract,
        mockDocumentId,
        DiadocDocumentStatus.REJECTED,
      );

      expect(mockContractService.updateOne).not.toHaveBeenCalled();
    });
  });

  // VF-2: Тесты для промежуточных статусов
  describe('VF-2: intermediate status handling', () => {
    describe('REPORT_WAITING_DIADOC status', () => {
      it('should transition from REPORT_WAITING_DIADOC to REPORT_WAITING_VERIFICATION on SIGNED', async () => {
        const mockFormPayment = createMockFormPaymentWithReport({
          status: FormPaymentStatus.REPORT_WAITING_DIADOC,
          docs: {
            report: mockFileId,
            reportDiadocDocumentId: mockDocumentId,
            reportIsDiadocSigning: true,
          },
        });

        await service.processFormPaymentReportStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
          { _id: mockFormPaymentId },
          expect.objectContaining({
            status: FormPaymentStatus.REPORT_WAITING_VERIFICATION,
            prevStatus: FormPaymentStatus.REPORT_WAITING_DIADOC,
          }),
        );
      });

      it('should transition from REPORT_WAITING_DIADOC to REPORT_WAITING_CORRECTIONS on REJECTED', async () => {
        const mockFormPayment = createMockFormPaymentWithReport({
          status: FormPaymentStatus.REPORT_WAITING_DIADOC,
          docs: {
            report: mockFileId,
            reportDiadocDocumentId: mockDocumentId,
            reportIsDiadocSigning: true,
          },
        });

        await service.processFormPaymentReportStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.REJECTED,
        );

        expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
          { _id: mockFormPaymentId },
          expect.objectContaining({
            status: FormPaymentStatus.REPORT_WAITING_CORRECTIONS,
            prevStatus: FormPaymentStatus.REPORT_WAITING_DIADOC,
          }),
        );
        expect(mockDiadocService.recordDocumentRejected).toHaveBeenCalled();
      });

      it('should transition from REPORT_WAITING_DIADOC to REPORT_WAITING on CANCELLED', async () => {
        const mockFormPayment = createMockFormPaymentWithReport({
          status: FormPaymentStatus.REPORT_WAITING_DIADOC,
          docs: {
            report: mockFileId,
            reportDiadocDocumentId: mockDocumentId,
            reportIsDiadocSigning: true,
          },
        });

        await service.processFormPaymentReportStatusChange(
          mockFormPayment,
          mockDocumentId,
          DiadocDocumentStatus.CANCELLED,
        );

        expect(mockFormPaymentService.updateOne).toHaveBeenCalledWith(
          { _id: mockFormPaymentId },
          expect.objectContaining({
            status: FormPaymentStatus.REPORT_WAITING,
            prevStatus: FormPaymentStatus.REPORT_WAITING_DIADOC,
          }),
        );
      });
    });

    describe('WAITING_DIADOC status for contracts', () => {
      it('should transition from WAITING_DIADOC to ACCEPTED on SIGNED', async () => {
        const mockContract = createMockContract({
          status: ContractStatus.WAITING_DIADOC,
          isDiadocSigning: true,
          diadocSentAt: new Date(),
        });

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.SIGNED,
        );

        expect(mockContractService.updateOne).toHaveBeenCalledWith(
          { _id: mockContractId },
          expect.objectContaining({
            status: ContractStatus.ACCEPTED,
          }),
        );
      });

      it('should transition from WAITING_DIADOC to REJECTED on REJECTED', async () => {
        const mockContract = createMockContract({
          status: ContractStatus.WAITING_DIADOC,
          isDiadocSigning: true,
        });

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.REJECTED,
        );

        expect(mockContractService.updateOne).toHaveBeenCalledWith(
          { _id: mockContractId },
          expect.objectContaining({
            status: ContractStatus.REJECTED,
          }),
        );
        expect(mockDiadocService.recordDocumentRejected).toHaveBeenCalled();
      });

      it('should transition from WAITING_DIADOC to CREATED on CANCELLED', async () => {
        const mockContract = createMockContract({
          status: ContractStatus.WAITING_DIADOC,
          isDiadocSigning: true,
        });

        await service.processContractStatusChange(
          mockContract,
          mockDocumentId,
          DiadocDocumentStatus.CANCELLED,
        );

        expect(mockContractService.updateOne).toHaveBeenCalledWith(
          { _id: mockContractId },
          expect.objectContaining({
            status: ContractStatus.CREATED,
            isDiadocSigning: false,
          }),
        );
      });
    });
  });
});
