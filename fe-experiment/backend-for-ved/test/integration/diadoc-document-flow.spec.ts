/**
 * VF-2: Integration tests for Diadoc document flow
 * Tests document upload -> status update -> webhook processing flow
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { setupTestDatabase, teardownTestDatabase } from '../setup/mongodb-memory-server';
import { DIADOC_SERVICE } from '../../src/modules/diadoc/diadoc.constants';
import { DiadocService } from '../../src/modules/diadoc/service/diadoc.service';
import { DiadocWebhookProcessorService } from '../../src/modules/diadoc/service/diadoc-webhook-processor.service';
import { DiadocXmlGeneratorService } from '../../src/modules/diadoc/service/diadoc-xml-generator.service';
import { FormPayment, FormPaymentSchema } from '../../src/modules/form-payment/service/form-payment.schema';
import { FormPaymentStatus } from '../../src/lib/enums/models/form-payment.enums';
import { DiadocDocumentStatus } from '../../src/modules/diadoc/service/diadoc.service.interface';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('Diadoc Document Flow Integration', () => {
  let module: TestingModule;
  let diadocService: DiadocService;
  let webhookProcessor: DiadocWebhookProcessorService;
  let formPaymentModel: mongoose.Model<FormPayment>;
  let httpService: HttpService;

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'diadoc') {
        return {
          enabled: true,
          apiUrl: 'https://diadoc-api.kontur.ru',
          apiClientId: 'test-api-client-id',
          authToken: 'test-auth-token',
          boxId: 'test-box-id',
          maxRetries: 0,
        };
      }
      return null;
    }),
  };

  const mockXmlGeneratorService = {
    generatePaymentOrderXml: jest.fn(),
    generateReportXml: jest.fn(),
    generateContractXml: jest.fn(),
  };

  const mockFormPaymentService = {
    findOneByPaymentOrderDiadocDocumentId: jest.fn(),
    findOneByReportDiadocDocumentId: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockFileService = {
    getFileBuffer: jest.fn(),
    saveFile: jest.fn(),
  };

  const createMockAxiosResponse = <T>(data: T): Partial<AxiosResponse<T>> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  });

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => mockConfigService.get('diadoc')],
        }),
        HttpModule,
        MongooseModule.forRoot(await setupTestDatabase()),
        MongooseModule.forFeature([{ name: FormPayment.name, schema: FormPaymentSchema }]),
      ],
      providers: [
        {
          provide: DIADOC_SERVICE,
          useClass: DiadocService,
        },
        DiadocService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DiadocXmlGeneratorService,
          useValue: mockXmlGeneratorService,
        },
        DiadocWebhookProcessorService,
        {
          provide: 'FORM_PAYMENT_SERVICE',
          useValue: mockFormPaymentService,
        },
        {
          provide: 'FILE_SERVICE',
          useValue: mockFileService,
        },
      ],
    }).compile();

    diadocService = module.get<DiadocService>(DIADOC_SERVICE);
    webhookProcessor = module.get<DiadocWebhookProcessorService>(DiadocWebhookProcessorService);
    formPaymentModel = module.get<mongoose.Model<FormPayment>>(getModelToken(FormPayment.name));
    httpService = module.get<HttpService>(HttpService);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await formPaymentModel.deleteMany({});
  });

  describe('Document Upload -> Status Update Flow', () => {
    it('should upload document and save documentId to FormPayment', async () => {
      mockHttpService.post.mockReturnValueOnce(
        of(createMockAxiosResponse({ MessageId: 'test-message-id' })),
      );

      const formPayment = await formPaymentModel.create({
        uid: 1,
        status: FormPaymentStatus.CREATED,
        docs: {
          paymentOrder: new mongoose.Types.ObjectId(),
        },
      });

      const buffer = Buffer.from('test content');
      const uploadResult = await diadocService.uploadDocument(
        buffer,
        'payment-order.pdf',
        'application/pdf',
      );

      // Simulate saving documentId to FormPayment
      await formPaymentModel.updateOne(
        { _id: formPayment._id },
        {
          $set: {
            'docs.paymentOrderDiadocDocumentId': uploadResult.documentId,
            'docs.paymentOrderDiadocMessageId': uploadResult.messageId,
          },
        },
      );

      const updated = await formPaymentModel.findById(formPayment._id);
      expect(updated?.docs?.paymentOrderDiadocDocumentId).toBe('test-message-id');
      expect(updated?.docs?.paymentOrderDiadocMessageId).toBe('test-message-id');
    });

    it('should process webhook and update FormPayment status', async () => {
      const formPayment = await formPaymentModel.create({
        uid: 1,
        status: FormPaymentStatus.SIGNING_ORDER,
        docs: {
          paymentOrderDiadocDocumentId: 'test-doc-id',
          paymentOrderDiadocMessageId: 'test-msg-id',
        },
      });

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(formPayment);
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse(Buffer.from('signed-pdf-content'))),
      );
      mockFileService.saveFile.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      mockFormPaymentService.update.mockResolvedValue({ ...formPayment, status: FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION });

      await webhookProcessor.processFormPaymentPaymentOrderStatusChange(
        formPayment,
        'test-doc-id',
        DiadocDocumentStatus.SIGNED,
      );

      expect(mockFormPaymentService.update).toHaveBeenCalled();
    });
  });

  describe('Webhook Processing Integration', () => {
    it('should handle webhook for signed document', async () => {
      const formPayment = await formPaymentModel.create({
        uid: 1,
        status: FormPaymentStatus.SIGNING_ORDER,
        docs: {
          paymentOrderDiadocDocumentId: 'test-doc-id',
        },
      });

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(formPayment);
      mockHttpService.get.mockReturnValueOnce(
        of(createMockAxiosResponse(Buffer.from('signed-content'))),
      );
      mockFileService.saveFile.mockResolvedValue({ _id: new mongoose.Types.ObjectId() });

      await webhookProcessor.processFormPaymentPaymentOrderStatusChange(
        formPayment,
        'test-doc-id',
        DiadocDocumentStatus.SIGNED,
      );

      expect(mockFileService.saveFile).toHaveBeenCalled();
    });

    it('should handle webhook for rejected document', async () => {
      const formPayment = await formPaymentModel.create({
        uid: 1,
        status: FormPaymentStatus.SIGNING_ORDER,
        docs: {
          paymentOrderDiadocDocumentId: 'test-doc-id',
        },
      });

      mockFormPaymentService.findOneByPaymentOrderDiadocDocumentId.mockResolvedValue(formPayment);

      await webhookProcessor.processFormPaymentPaymentOrderStatusChange(
        formPayment,
        'test-doc-id',
        DiadocDocumentStatus.REJECTED,
      );

      expect(mockFormPaymentService.update).toHaveBeenCalled();
    });
  });
});
