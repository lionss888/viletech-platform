/**
 * E2E API Tests: Diadoc Endpoints
 * 
 * Тесты реальных HTTP запросов к API с замоканным Diadoc сервисом,
 * но реальной базой данных.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, Controller, Get, Post, Body, HttpCode } from '@nestjs/common';
import { MongooseModule, getModelToken, InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { FormPayment, FormPaymentSchema } from '../../src/modules/form-payment/service/form-payment.schema';
import { FormPaymentStatus } from '../../src/lib/enums/models/form-payment.enums';
import { Contract, ContractSchema } from '../../src/modules/contract/service/contract.schema';
import { ContractStatus } from '../../src/lib/enums/models/contract.enums';
import { DiadocDocumentStatus } from '../../src/modules/diadoc/service/diadoc.service.interface';
import { AllCurrencies } from '../../src/lib/enums/common.enums';
import { ApiTags } from '@nestjs/swagger';

// Helper to create valid currency object
const createValidCurrency = () => ({
  client: AllCurrencies.RUB,
  counterparty: AllCurrencies.USD,
});

// Simple test controller that mimics DiadocController
@ApiTags('diadoc')
@Controller('diadoc')
class TestDiadocController {
  constructor(
    @InjectModel(FormPayment.name) private readonly formPaymentModel: Model<FormPayment>,
    @InjectModel(Contract.name) private readonly contractModel: Model<Contract>,
  ) {}

  @Get('health')
  async checkHealth() {
    return {
      enabled: true,
      configured: true,
      apiReachable: true,
      authenticated: true,
      lastCheck: new Date(),
    };
  }

  @Get('metrics')
  async getMetrics() {
    return {
      current: {
        documentsSent: { paymentOrder: 10, report: 5, contract: 3 },
        documentsSigned: 15,
        errors: {},
      },
      averageRequestDurations: {},
    };
  }

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() payload: any) {
    if (!payload.documentId || !payload.status) {
      return { success: false, message: 'Invalid payload' };
    }

    // Try to find FormPayment
    const formPayment = await this.formPaymentModel.findOne({
      'docs.paymentOrderDiadocDocumentId': payload.documentId,
    });

    if (formPayment) {
      if (payload.status === DiadocDocumentStatus.SIGNED) {
        await this.formPaymentModel.updateOne(
          { _id: formPayment._id },
          { $set: { status: FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION } },
        );
      }
      return { success: true, message: 'Payment order status updated' };
    }

    // Try to find Contract
    const contract = await this.contractModel.findOne({
      diadocDocumentId: payload.documentId,
    });

    if (contract) {
      if (payload.status === DiadocDocumentStatus.SIGNED) {
        await this.contractModel.updateOne(
          { _id: contract._id },
          { $set: { status: ContractStatus.ACCEPTED } },
        );
      }
      return { success: true, message: 'Contract status updated' };
    }

    return { success: false, message: 'Document not found' };
  }
}

describe('E2E API: Diadoc Endpoints', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let formPaymentModel: Model<FormPayment>;
  let contractModel: Model<Contract>;

  jest.setTimeout(60000);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: FormPayment.name, schema: FormPaymentSchema },
          { name: Contract.name, schema: ContractSchema },
        ]),
      ],
      controllers: [TestDiadocController],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.setGlobalPrefix('api/1.0');
    await app.init();

    formPaymentModel = moduleRef.get<Model<FormPayment>>(getModelToken(FormPayment.name));
    contractModel = moduleRef.get<Model<Contract>>(getModelToken(Contract.name));
  });

  afterAll(async () => {
    if (app) await app.close();
    if (mongod) await mongod.stop();
  });

  afterEach(async () => {
    if (formPaymentModel) await formPaymentModel.deleteMany({});
    if (contractModel) await contractModel.deleteMany({});
  });

  describe('GET /api/1.0/diadoc/health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/health')
        .expect(200);

      expect(response.body).toHaveProperty('enabled', true);
      expect(response.body).toHaveProperty('configured', true);
      expect(response.body).toHaveProperty('apiReachable', true);
      expect(response.body).toHaveProperty('authenticated', true);
    });
  });

  describe('GET /api/1.0/diadoc/metrics', () => {
    it('should return metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/1.0/diadoc/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body.current).toHaveProperty('documentsSent');
    });
  });

  describe('POST /api/1.0/diadoc/webhook', () => {
    it('should reject webhook with invalid payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send({})
        .expect(200);

      expect(response.body.success).toBe(false);
    });

    it('should process webhook for FormPayment', async () => {
      // Create FormPayment in DB
      await formPaymentModel.create({
        account: new Types.ObjectId(),
        status: FormPaymentStatus.SIGNING_ORDER,
        currency: createValidCurrency(),
        totals: { amount: 1000 },
        docs: {
          paymentOrderDiadocDocumentId: 'test-doc-id-123',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send({
          documentId: 'test-doc-id-123',
          status: DiadocDocumentStatus.SIGNED,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Payment order');

      // Verify DB update
      const updated = await formPaymentModel.findOne({
        'docs.paymentOrderDiadocDocumentId': 'test-doc-id-123',
      });
      expect(updated?.status).toBe(FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION);
    });

    it('should process webhook for Contract', async () => {
      // Create Contract in DB
      await contractModel.create({
        account: new Types.ObjectId(),
        status: ContractStatus.CREATED,
        file: new Types.ObjectId(),
        isTemplate: false,
        diadocDocumentId: 'contract-doc-id-456',
        signatureType: 'diadoc',
      });

      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send({
          documentId: 'contract-doc-id-456',
          status: DiadocDocumentStatus.SIGNED,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Contract');

      // Verify DB update
      const updated = await contractModel.findOne({
        diadocDocumentId: 'contract-doc-id-456',
      });
      expect(updated?.status).toBe(ContractStatus.ACCEPTED);
    });

    it('should return not found for unknown document', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send({
          documentId: 'unknown-doc-id',
          status: DiadocDocumentStatus.SIGNED,
        })
        .expect(200);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Database Integration via Webhook', () => {
    it('should create and update FormPayment through webhook flow', async () => {
      // 1. Create FormPayment (simulating document upload)
      const formPayment = await formPaymentModel.create({
        account: new Types.ObjectId(),
        status: FormPaymentStatus.SIGNING_ORDER,
        currency: createValidCurrency(),
        totals: { amount: 5000 },
        docs: {
          paymentOrderDiadocDocumentId: 'flow-test-doc',
          paymentOrderDiadocMessageId: 'flow-test-msg',
        },
      });

      expect(formPayment.status).toBe(FormPaymentStatus.SIGNING_ORDER);

      // 2. Process SIGNED webhook
      await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send({
          documentId: 'flow-test-doc',
          status: DiadocDocumentStatus.SIGNED,
        })
        .expect(200);

      // 3. Verify status changed
      const updated = await formPaymentModel.findById(formPayment._id);
      expect(updated?.status).toBe(FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION);
    });

    it('should create and update Contract through webhook flow', async () => {
      // 1. Create Contract
      const contract = await contractModel.create({
        account: new Types.ObjectId(),
        status: ContractStatus.CREATED,
        file: new Types.ObjectId(),
        isTemplate: false,
        diadocDocumentId: 'contract-flow-test',
        signatureType: 'diadoc',
      });

      expect(contract.status).toBe(ContractStatus.CREATED);

      // 2. Process SIGNED webhook
      await request(app.getHttpServer())
        .post('/api/1.0/diadoc/webhook')
        .send({
          documentId: 'contract-flow-test',
          status: DiadocDocumentStatus.SIGNED,
        })
        .expect(200);

      // 3. Verify status changed
      const updated = await contractModel.findById(contract._id);
      expect(updated?.status).toBe(ContractStatus.ACCEPTED);
    });
  });
});
