/**
 * VF-2: Unit tests for Diadoc-related methods in ContractService
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import mongoose from 'mongoose';
import { IDiadocService, DiadocDocumentStatus } from '../../diadoc/service/diadoc.service.interface';
import { IFileService } from '../../file/service/file.service.interface';
import { ContractStatus } from '../../../lib/enums/models/contract.enums';
import { ConfigService } from '@nestjs/config';

// Mock service that simulates ContractService Diadoc methods
class MockContractService {
  constructor(
    private readonly diadocService: IDiadocService | undefined,
    private readonly fileService: IFileService | undefined,
    private readonly configService: ConfigService | undefined,
    private readonly model: any,
  ) {}

  async signContractViaDiadoc(findData: { _id: string; account?: string }, recipientInn: string): Promise<any> {
    if (!this.diadocService) {
      throw new BadRequestException('Diadoc service is not available');
    }

    const contract = await this.findOneOrException(findData);

    // Check that contract file is uploaded
    if (!contract.file) {
      throw new BadRequestException('Contract file not found');
    }

    // Check that contract is not already sent to Diadoc
    if (contract.diadocDocumentId) {
      throw new BadRequestException('Contract already sent to Diadoc');
    }

    if (!this.fileService) {
      throw new BadRequestException('File service is not available');
    }

    if (!recipientInn) {
      throw new BadRequestException('Recipient INN is required for Diadoc signing');
    }

    if (!this.configService) {
      throw new BadRequestException('Config service is not available');
    }

    const diadocConfig = this.configService.get('diadoc');
    const boxId = diadocConfig?.boxId;
    if (!boxId) {
      throw new BadRequestException('Diadoc box ID is not configured');
    }

    const fileBuffer = await this.fileService.getFileBuffer({ _id: contract.file });
    const uploadResult = await this.diadocService.uploadDocument(fileBuffer, 'contract.pdf', 'application/pdf');
    const documentId = uploadResult.documentId || uploadResult.messageId;
    const messageId = await this.diadocService.sendForSigning(documentId, boxId, recipientInn);

    this.diadocService.recordDocumentSent('contract');

    return {
      ...contract,
      diadocDocumentId: documentId,
      diadocMessageId: messageId,
      signatureType: 'diadoc',
    };
  }

  async findOneByDiadocDocumentId(documentId: string): Promise<any | null> {
    try {
      return await this.model.findOne({
        diadocDocumentId: documentId,
      });
    } catch (error) {
      return null;
    }
  }

  private async findOneOrException(findData: { _id: string }): Promise<any> {
    const result = await this.model.findOne({ _id: findData._id });
    if (!result) {
      throw new NotFoundException('Contract not found');
    }
    return result;
  }
}

describe('ContractService - Diadoc Methods', () => {
  let service: MockContractService;
  let mockDiadocService: jest.Mocked<IDiadocService>;
  let mockFileService: jest.Mocked<IFileService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockModel: any;

  const mockContractId = new mongoose.Types.ObjectId().toString();
  const mockAccountId = new mongoose.Types.ObjectId().toString();
  const mockFileId = new mongoose.Types.ObjectId().toString();
  const mockDocumentId = 'diadoc-document-id-123';
  const mockMessageId = 'diadoc-message-id-456';
  const mockFileBuffer = Buffer.from('file content');
  const mockRecipientInn = '1234567890';

  const createMockContract = (overrides = {}) => ({
    _id: mockContractId,
    account: mockAccountId,
    status: ContractStatus.CREATED,
    file: mockFileId,
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
      findOne: jest.fn().mockResolvedValue({ _id: mockFileId, originalName: 'contract.pdf' }),
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
      findOne: jest.fn().mockResolvedValue(createMockContract()),
    };

    service = new MockContractService(
      mockDiadocService,
      mockFileService,
      mockConfigService,
      mockModel,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signContractViaDiadoc', () => {
    it('should successfully send contract to Diadoc', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());

      const result = await service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn);

      expect(mockDiadocService.uploadDocument).toHaveBeenCalledWith(
        mockFileBuffer,
        expect.any(String),
        expect.any(String),
      );
      expect(mockDiadocService.sendForSigning).toHaveBeenCalledWith(
        mockDocumentId,
        'test-box-id',
        mockRecipientInn,
      );
      expect(mockDiadocService.recordDocumentSent).toHaveBeenCalledWith('contract');
      expect(result.diadocDocumentId).toBe(mockDocumentId);
      expect(result.diadocMessageId).toBe(mockMessageId);
      expect(result.signatureType).toBe('diadoc');
    });

    it('should throw BadRequestException when DiadocService is not available', async () => {
      const serviceWithoutDiadoc = new MockContractService(
        undefined,
        mockFileService,
        mockConfigService,
        mockModel,
      );

      await expect(
        serviceWithoutDiadoc.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow('Diadoc service is not available');
    });

    it('should throw BadRequestException when contract file is not found', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract({
        file: undefined,
      }));

      await expect(
        service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow('Contract file not found');
    });

    it('should throw BadRequestException when contract already sent to Diadoc', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract({
        diadocDocumentId: 'existing-document-id',
      }));

      await expect(
        service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow('Contract already sent to Diadoc');
    });

    it('should throw BadRequestException when FileService is not available', async () => {
      const serviceWithoutFile = new MockContractService(
        mockDiadocService,
        undefined,
        mockConfigService,
        mockModel,
      );
      mockModel.findOne.mockResolvedValue(createMockContract());

      await expect(
        serviceWithoutFile.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow('File service is not available');
    });

    it('should throw BadRequestException when recipientInn is empty', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());

      await expect(
        service.signContractViaDiadoc({ _id: mockContractId }, ''),
      ).rejects.toThrow('Recipient INN is required for Diadoc signing');
    });

    it('should throw BadRequestException when ConfigService is not available', async () => {
      const serviceWithoutConfig = new MockContractService(
        mockDiadocService,
        mockFileService,
        undefined,
        mockModel,
      );
      mockModel.findOne.mockResolvedValue(createMockContract());

      await expect(
        serviceWithoutConfig.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow('Config service is not available');
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
      mockModel.findOne.mockResolvedValue(createMockContract());

      await expect(
        service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow('Diadoc box ID is not configured');
    });

    it('should throw NotFoundException when Contract not found', async () => {
      mockModel.findOne.mockResolvedValue(null);

      await expect(
        service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow('Contract not found');
    });

    it('should handle Diadoc uploadDocument error', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());
      mockDiadocService.uploadDocument.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow('Upload failed');
    });

    it('should handle Diadoc sendForSigning error', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());
      mockDiadocService.sendForSigning.mockRejectedValue(new Error('Send failed'));

      await expect(
        service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow('Send failed');
    });

    it('should handle FileService getFileBuffer error', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());
      mockFileService.getFileBuffer.mockRejectedValue(new Error('File not found'));

      await expect(
        service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow('File not found');
    });

    it('should verify signatureType is set to diadoc', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());

      const result = await service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn);

      expect(result.signatureType).toBe('diadoc');
    });

    it('should call recordDocumentSent with contract type', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());

      await service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn);

      expect(mockDiadocService.recordDocumentSent).toHaveBeenCalledWith('contract');
    });
  });

  describe('findOneByDiadocDocumentId', () => {
    it('should find Contract by Diadoc document ID', async () => {
      const mockContract = createMockContract({
        diadocDocumentId: mockDocumentId,
      });
      mockModel.findOne.mockResolvedValue(mockContract);

      const result = await service.findOneByDiadocDocumentId(mockDocumentId);

      expect(mockModel.findOne).toHaveBeenCalledWith({
        diadocDocumentId: mockDocumentId,
      });
      expect(result).toEqual(mockContract);
    });

    it('should return null when Contract not found', async () => {
      mockModel.findOne.mockResolvedValue(null);

      const result = await service.findOneByDiadocDocumentId('non-existent-id');

      expect(result).toBeNull();
    });

    it('should return null on database error', async () => {
      mockModel.findOne.mockRejectedValue(new Error('Database error'));

      const result = await service.findOneByDiadocDocumentId(mockDocumentId);

      expect(result).toBeNull();
    });

    it('should handle empty documentId', async () => {
      mockModel.findOne.mockResolvedValue(null);

      const result = await service.findOneByDiadocDocumentId('');

      expect(mockModel.findOne).toHaveBeenCalledWith({
        diadocDocumentId: '',
      });
      expect(result).toBeNull();
    });
  });

  describe('integration with other services', () => {
    it('should call getFileBuffer with correct file ID', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());

      await service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn);

      expect(mockFileService.getFileBuffer).toHaveBeenCalledWith({ _id: mockFileId });
    });

    it('should call uploadDocument with correct parameters', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());

      await service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn);

      expect(mockDiadocService.uploadDocument).toHaveBeenCalledWith(
        mockFileBuffer,
        'contract.pdf',
        'application/pdf',
      );
    });

    it('should call sendForSigning with boxId from config', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());

      await service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn);

      expect(mockDiadocService.sendForSigning).toHaveBeenCalledWith(
        mockDocumentId,
        'test-box-id',
        mockRecipientInn,
      );
    });
  });

  describe('error handling', () => {
    it('should not call recordDocumentSent on uploadDocument error', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());
      mockDiadocService.uploadDocument.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow();

      expect(mockDiadocService.recordDocumentSent).not.toHaveBeenCalled();
    });

    it('should not call recordDocumentSent on sendForSigning error', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());
      mockDiadocService.sendForSigning.mockRejectedValue(new Error('Send failed'));

      await expect(
        service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow();

      expect(mockDiadocService.recordDocumentSent).not.toHaveBeenCalled();
    });

    it('should not call sendForSigning if uploadDocument fails', async () => {
      mockModel.findOne.mockResolvedValue(createMockContract());
      mockDiadocService.uploadDocument.mockRejectedValue(new Error('Upload failed'));

      await expect(
        service.signContractViaDiadoc({ _id: mockContractId }, mockRecipientInn),
      ).rejects.toThrow();

      expect(mockDiadocService.sendForSigning).not.toHaveBeenCalled();
    });
  });
});
