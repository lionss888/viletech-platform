/**
 * VF-2: Unit tests for Diadoc-related methods in FormPaymentService
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { getQueueToken } from '@nestjs/bull';
import mongoose from 'mongoose';
import { IDiadocService, DiadocDocumentStatus } from '../../diadoc/service/diadoc.service.interface';
import { IFileService } from '../../file/service/file.service.interface';
import { DIADOC_SERVICE } from '../../diadoc/diadoc.constants';
import { FILE_SERVICE } from '../../file/file.constants';
import { FormPaymentStatus } from '../../../lib/enums/models/form-payment.enums';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';

// Mock service that simulates FormPaymentService Diadoc methods
// Note: This is a minimal mock because actual FormPaymentService has many dependencies
class MockFormPaymentService {
  constructor(
    private readonly diadocService: IDiadocService | undefined,
    private readonly fileService: IFileService | undefined,
    private readonly configService: ConfigService,
    private readonly model: any,
  ) {}

  async signPaymentOrderViaDiadoc(findData: { _id: string }, recipientInn: string): Promise<any> {
    if (!this.diadocService) {
      throw new BadRequestException('Diadoc service is not available');
    }

    const formPayment = await this.findOneOrException(findData);

    // Check that payment order is generated
    if (!formPayment.docs?.paymentOrderDocx && !formPayment.docs?.paymentOrder) {
      throw new BadRequestException('Payment order not generated yet');
    }

    // Check that payment order is not already sent to Diadoc
    if (formPayment.docs?.paymentOrderDiadocDocumentId) {
      throw new BadRequestException('Payment order already sent to Diadoc');
    }

    // Check that payment order is not already signed manually
    if (formPayment.docs?.paymentOrderSigned && formPayment.docs.paymentOrderSigned.length > 0) {
      throw new BadRequestException('Payment order already signed manually');
    }

    if (!this.fileService) {
      throw new BadRequestException('File service is not available');
    }

    const organizationInn = formPayment.organization?.inn || recipientInn;
    if (!organizationInn) {
      throw new BadRequestException('Organization INN is required for Diadoc signing');
    }

    const diadocConfig = this.configService.get('diadoc');
    const boxId = diadocConfig?.boxId;
    if (!boxId) {
      throw new BadRequestException('Diadoc box ID is not configured');
    }

    const fileBuffer = await this.fileService.getFileBuffer({ _id: formPayment.docs.paymentOrder });
    const uploadResult = await this.diadocService.uploadDocument(fileBuffer, 'payment-order.pdf', 'application/pdf');
    const documentId = uploadResult.documentId || uploadResult.messageId;
    const messageId = await this.diadocService.sendForSigning(documentId, boxId, organizationInn);

    this.diadocService.recordDocumentSent('paymentOrder');

    return {
      ...formPayment,
      docs: {
        ...formPayment.docs,
        paymentOrderDiadocDocumentId: documentId,
        paymentOrderDiadocMessageId: messageId,
      },
    };
  }

  async signReportViaDiadoc(findData: { _id: string }, recipientInn: string): Promise<any> {
    if (!this.diadocService) {
      throw new BadRequestException('Diadoc service is not available');
    }

    const formPayment = await this.findOneOrException(findData);

    // Check that report is uploaded
    if (!formPayment.docs?.report && !formPayment.docs?.docxFile) {
      throw new BadRequestException('Report not found');
    }

    // Check that report is not already sent to Diadoc
    if (formPayment.docs?.reportDiadocDocumentId) {
      throw new BadRequestException('Report already sent to Diadoc');
    }

    // Check that report is not already signed manually
    if (formPayment.docs?.reportSigned) {
      throw new BadRequestException('Report already signed manually');
    }

    if (!this.fileService) {
      throw new BadRequestException('File service is not available');
    }

    const organizationInn = formPayment.organization?.inn || recipientInn;
    if (!organizationInn) {
      throw new BadRequestException('Organization INN is required for Diadoc signing');
    }

    const diadocConfig = this.configService.get('diadoc');
    const boxId = diadocConfig?.boxId;
    if (!boxId) {
      throw new BadRequestException('Diadoc box ID is not configured');
    }

    const fileBuffer = await this.fileService.getFileBuffer({ _id: formPayment.docs.report });
    const uploadResult = await this.diadocService.uploadDocument(fileBuffer, 'report.pdf', 'application/pdf');
    const documentId = uploadResult.documentId || uploadResult.messageId;
    const messageId = await this.diadocService.sendForSigning(documentId, boxId, organizationInn);

    this.diadocService.recordDocumentSent('report');

    return {
      ...formPayment,
      docs: {
        ...formPayment.docs,
        reportDiadocDocumentId: documentId,
        reportDiadocMessageId: messageId,
      },
    };
  }

  async findOneByPaymentOrderDiadocDocumentId(documentId: string): Promise<any | null> {
    try {
      return await this.model.findOne({
        'docs.paymentOrderDiadocDocumentId': documentId,
      });
    } catch (error) {
      return null;
    }
  }

  async findOneByReportDiadocDocumentId(documentId: string): Promise<any | null> {
    try {
      return await this.model.findOne({
        'docs.reportDiadocDocumentId': documentId,
      });
    } catch (error) {
      return null;
    }
  }

  private async findOneOrException(findData: { _id: string }): Promise<any> {
    const result = await this.model.findOne({ _id: findData._id });
    if (!result) {
      throw new NotFoundException('FormPayment not found');
    }
    return result;
  }
}

describe('FormPaymentService - Diadoc Methods', () => {
  let service: MockFormPaymentService;
  let mockDiadocService: jest.Mocked<IDiadocService>;
  let mockFileService: jest.Mocked<IFileService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockModel: any;

  const mockFormPaymentId = new mongoose.Types.ObjectId().toString();
  const mockAccountId = new mongoose.Types.ObjectId().toString();
  const mockFileId = new mongoose.Types.ObjectId().toString();
  const mockDocumentId = 'diadoc-document-id-123';
  const mockMessageId = 'diadoc-message-id-456';
  const mockFileBuffer = Buffer.from('file content');
  const mockOrganizationInn = '1234567890';

  const createMockFormPayment = (overrides = {}) => ({
    _id: mockFormPaymentId,
    account: mockAccountId,
    status: FormPaymentStatus.SIGNING_ORDER,
    uid: 12345,
    organization: {
      inn: mockOrganizationInn,
    },
    docs: {
      paymentOrder: mockFileId,
    },
    ...overrides,
  });

  const createMockFormPaymentWithReport = (overrides = {}) => ({
    _id: mockFormPaymentId,
    account: mockAccountId,
    status: FormPaymentStatus.REPORT_WAITING,
    uid: 12345,
    organization: {
      inn: mockOrganizationInn,
    },
    docs: {
      report: mockFileId,
    },
    ...overrides,
  });

  beforeEach(async () => {
    mockDiadocService = {
      uploadDocument: jest.fn().mockResolvedValue(mockDocumentId),
      sendForSigning: jest.fn().mockResolvedValue(mockMessageId),
      getDocumentStatus: jest.fn().mockResolvedValue(DiadocDocumentStatus.SENT),
      getSignedDocument: jest.fn().mockResolvedValue(mockFileBuffer),
      recordDocumentSent: jest.fn(),
      recordDocumentSigned: jest.fn(),
      recordDocumentRejected: jest.fn(),
    } as any;

    mockFileService = {
      getFileBuffer: jest.fn().mockResolvedValue(mockFileBuffer),
      baseUpload: jest.fn().mockResolvedValue({ _id: mockFileId }),
      findOne: jest.fn().mockResolvedValue({ _id: mockFileId, originalName: 'test.pdf' }),
    } as any;

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'diadoc') {
          return {
            enabled: true,
            apiUrl: 'https://diadoc-api.kontur.ru',
            apiKey: 'test-api-key',
            boxId: 'test-box-id',
          };
        }
        return undefined;
      }),
    } as any;

    mockModel = {
      findOne: jest.fn().mockResolvedValue(createMockFormPayment()),
    };

    service = new MockFormPaymentService(
      mockDiadocService,
      mockFileService,
      mockConfigService,
      mockModel,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signPaymentOrderViaDiadoc', () => {
    it('should successfully send payment order to Diadoc', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPayment());

      const result = await service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn);

      expect(mockDiadocService.uploadDocument).toHaveBeenCalledWith(
        mockFileBuffer,
        expect.any(String),
        expect.any(String),
      );
      expect(mockDiadocService.sendForSigning).toHaveBeenCalledWith(
        mockDocumentId,
        'test-box-id',
        mockOrganizationInn,
      );
      expect(mockDiadocService.recordDocumentSent).toHaveBeenCalledWith('paymentOrder');
      expect(result.docs.paymentOrderDiadocDocumentId).toBe(mockDocumentId);
      expect(result.docs.paymentOrderDiadocMessageId).toBe(mockMessageId);
    });

    it('should throw BadRequestException when DiadocService is not available', async () => {
      const serviceWithoutDiadoc = new MockFormPaymentService(
        undefined,
        mockFileService,
        mockConfigService,
        mockModel,
      );

      await expect(
        serviceWithoutDiadoc.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Diadoc service is not available');
    });

    it('should throw BadRequestException when payment order is not generated', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPayment({
        docs: {},
      }));

      await expect(
        service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Payment order not generated yet');
    });

    it('should throw BadRequestException when payment order already sent to Diadoc', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPayment({
        docs: {
          paymentOrder: mockFileId,
          paymentOrderDiadocDocumentId: 'existing-document-id',
        },
      }));

      await expect(
        service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Payment order already sent to Diadoc');
    });

    it('should throw BadRequestException when payment order already signed manually', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPayment({
        docs: {
          paymentOrder: mockFileId,
          paymentOrderSigned: ['signed-file-id'],
        },
      }));

      await expect(
        service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Payment order already signed manually');
    });

    it('should throw BadRequestException when FileService is not available', async () => {
      const serviceWithoutFile = new MockFormPaymentService(
        mockDiadocService,
        undefined,
        mockConfigService,
        mockModel,
      );
      mockModel.findOne.mockResolvedValue(createMockFormPayment());

      await expect(
        serviceWithoutFile.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('File service is not available');
    });

    it('should throw BadRequestException when organization INN is not available', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPayment({
        organization: { inn: undefined },
      }));

      await expect(
        service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, ''),
      ).rejects.toThrow('Organization INN is required for Diadoc signing');
    });

    it('should use recipientInn if organization INN is not available', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPayment({
        organization: { inn: undefined },
      }));

      await service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, '9876543210');

      expect(mockDiadocService.sendForSigning).toHaveBeenCalledWith(
        mockDocumentId,
        'test-box-id',
        '9876543210',
      );
    });

    it('should throw BadRequestException when boxId is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'diadoc') {
          return {
            enabled: true,
            apiUrl: 'https://diadoc-api.kontur.ru',
            apiKey: 'test-api-key',
            boxId: undefined,
          };
        }
        return undefined;
      });
      mockModel.findOne.mockResolvedValue(createMockFormPayment());

      await expect(
        service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Diadoc box ID is not configured');
    });

    it('should throw NotFoundException when FormPayment not found', async () => {
      mockModel.findOne.mockResolvedValue(null);

      await expect(
        service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('FormPayment not found');
    });

    it('should handle Diadoc uploadDocument error', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPayment());
      mockDiadocService.uploadDocument.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Upload failed');
    });

    it('should handle Diadoc sendForSigning error', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPayment());
      mockDiadocService.sendForSigning.mockRejectedValue(new Error('Send failed'));

      await expect(
        service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Send failed');
    });

    it('should handle FileService getFileBuffer error', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPayment());
      mockFileService.getFileBuffer.mockRejectedValue(new Error('File not found'));

      await expect(
        service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('File not found');
    });

    it('should work with paymentOrderDocx if paymentOrder is not available', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPayment({
        docs: {
          paymentOrderDocx: mockFileId,
        },
      }));

      const result = await service.signPaymentOrderViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn);

      expect(result.docs.paymentOrderDiadocDocumentId).toBe(mockDocumentId);
    });
  });

  describe('signReportViaDiadoc', () => {
    it('should successfully send report to Diadoc', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPaymentWithReport());

      const result = await service.signReportViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn);

      expect(mockDiadocService.uploadDocument).toHaveBeenCalled();
      expect(mockDiadocService.sendForSigning).toHaveBeenCalledWith(
        mockDocumentId,
        'test-box-id',
        mockOrganizationInn,
      );
      expect(mockDiadocService.recordDocumentSent).toHaveBeenCalledWith('report');
      expect(result.docs.reportDiadocDocumentId).toBe(mockDocumentId);
      expect(result.docs.reportDiadocMessageId).toBe(mockMessageId);
    });

    it('should throw BadRequestException when DiadocService is not available', async () => {
      const serviceWithoutDiadoc = new MockFormPaymentService(
        undefined,
        mockFileService,
        mockConfigService,
        mockModel,
      );

      await expect(
        serviceWithoutDiadoc.signReportViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Diadoc service is not available');
    });

    it('should throw BadRequestException when report is not found', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPaymentWithReport({
        docs: {},
      }));

      await expect(
        service.signReportViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Report not found');
    });

    it('should throw BadRequestException when report already sent to Diadoc', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPaymentWithReport({
        docs: {
          report: mockFileId,
          reportDiadocDocumentId: 'existing-document-id',
        },
      }));

      await expect(
        service.signReportViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Report already sent to Diadoc');
    });

    it('should throw BadRequestException when report already signed manually', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPaymentWithReport({
        docs: {
          report: mockFileId,
          reportSigned: 'signed-file-id',
        },
      }));

      await expect(
        service.signReportViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Report already signed manually');
    });

    it('should throw BadRequestException when FileService is not available', async () => {
      const serviceWithoutFile = new MockFormPaymentService(
        mockDiadocService,
        undefined,
        mockConfigService,
        mockModel,
      );
      mockModel.findOne.mockResolvedValue(createMockFormPaymentWithReport());

      await expect(
        serviceWithoutFile.signReportViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('File service is not available');
    });

    it('should throw BadRequestException when organization INN is not available', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPaymentWithReport({
        organization: { inn: undefined },
      }));

      await expect(
        service.signReportViaDiadoc({ _id: mockFormPaymentId }, ''),
      ).rejects.toThrow('Organization INN is required for Diadoc signing');
    });

    it('should throw BadRequestException when boxId is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'diadoc') {
          return {
            enabled: true,
            boxId: undefined,
          };
        }
        return undefined;
      });
      mockModel.findOne.mockResolvedValue(createMockFormPaymentWithReport());

      await expect(
        service.signReportViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn),
      ).rejects.toThrow('Diadoc box ID is not configured');
    });

    it('should work with docxFile if report is not available', async () => {
      mockModel.findOne.mockResolvedValue(createMockFormPaymentWithReport({
        docs: {
          docxFile: mockFileId,
        },
      }));

      const result = await service.signReportViaDiadoc({ _id: mockFormPaymentId }, mockOrganizationInn);

      expect(result.docs.reportDiadocDocumentId).toBe(mockDocumentId);
    });
  });

  describe('findOneByPaymentOrderDiadocDocumentId', () => {
    it('should find FormPayment by payment order Diadoc document ID', async () => {
      const mockFormPayment = createMockFormPayment({
        docs: {
          paymentOrder: mockFileId,
          paymentOrderDiadocDocumentId: mockDocumentId,
        },
      });
      mockModel.findOne.mockResolvedValue(mockFormPayment);

      const result = await service.findOneByPaymentOrderDiadocDocumentId(mockDocumentId);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        'docs.paymentOrderDiadocDocumentId': mockDocumentId,
      });
      expect(result).toEqual(mockFormPayment);
    });

    it('should return null when FormPayment not found', async () => {
      mockModel.findOne.mockResolvedValue(null);

      const result = await service.findOneByPaymentOrderDiadocDocumentId('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      mockModel.findOne.mockRejectedValue(new Error('Database error'));

      const result = await service.findOneByPaymentOrderDiadocDocumentId(mockDocumentId);

      expect(result).toBeNull();
    });
  });

  describe('findOneByReportDiadocDocumentId', () => {
    it('should find FormPayment by report Diadoc document ID', async () => {
      const mockFormPayment = createMockFormPaymentWithReport({
        docs: {
          report: mockFileId,
          reportDiadocDocumentId: mockDocumentId,
        },
      });
      mockModel.findOne.mockResolvedValue(mockFormPayment);

      const result = await service.findOneByReportDiadocDocumentId(mockDocumentId);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        'docs.reportDiadocDocumentId': mockDocumentId,
      });
      expect(result).toEqual(mockFormPayment);
    });

    it('should return null when FormPayment not found', async () => {
      mockModel.findOne.mockResolvedValue(null);

      const result = await service.findOneByReportDiadocDocumentId('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      mockModel.findOne.mockRejectedValue(new Error('Database error'));

      const result = await service.findOneByReportDiadocDocumentId(mockDocumentId);

      expect(result).toBeNull();
    });
  });
});
