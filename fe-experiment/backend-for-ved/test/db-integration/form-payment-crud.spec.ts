/**
 * Database Integration Tests: FormPayment CRUD
 * 
 * Эти тесты проверяют реальную работу с базой данных.
 * Используют mongodb-memory-server для изоляции.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { FormPayment, FormPaymentSchema } from '../../src/modules/form-payment/service/form-payment.schema';
import { FormPaymentStatus } from '../../src/lib/enums/models/form-payment.enums';
import { AllCurrencies } from '../../src/lib/enums/common.enums';

// Helper to create valid currency object
const createValidCurrency = () => ({
  client: AllCurrencies.RUB,
  counterparty: AllCurrencies.USD,
});

describe('Database Integration: FormPayment CRUD', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let formPaymentModel: Model<FormPayment>;

  jest.setTimeout(60000);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: FormPayment.name, schema: FormPaymentSchema },
        ]),
      ],
    }).compile();

    formPaymentModel = moduleRef.get<Model<FormPayment>>(getModelToken(FormPayment.name));
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
    if (mongod) {
      await mongod.stop();
    }
  });

  afterEach(async () => {
    if (formPaymentModel) {
      await formPaymentModel.deleteMany({});
    }
  });

  describe('Create Operations', () => {
    it('should create FormPayment document', async () => {
      const formPaymentData = {
        account: new Types.ObjectId(),
        status: FormPaymentStatus.DRAFT,
        currency: createValidCurrency(),
        totals: { amount: 1000 },
      };

      const created = await formPaymentModel.create(formPaymentData);

      expect(created._id).toBeDefined();
      expect(created.status).toBe(FormPaymentStatus.DRAFT);
      expect(created.totals?.amount).toBe(1000);
    });

    it('should create FormPayment with Diadoc fields', async () => {
      const formPaymentData = {
        account: new Types.ObjectId(),
        status: FormPaymentStatus.SIGNING_ORDER,
        currency: createValidCurrency(),
        totals: { amount: 1000 },
        docs: {
          paymentOrderDiadocDocumentId: 'diadoc-doc-123',
          paymentOrderDiadocMessageId: 'diadoc-msg-456',
        },
      };

      const created = await formPaymentModel.create(formPaymentData);

      expect(created.docs?.paymentOrderDiadocDocumentId).toBe('diadoc-doc-123');
      expect(created.docs?.paymentOrderDiadocMessageId).toBe('diadoc-msg-456');
    });
  });

  describe('Read Operations', () => {
    it('should find FormPayment by ID', async () => {
      const created = await formPaymentModel.create({
        account: new Types.ObjectId(),
        status: FormPaymentStatus.DRAFT,
        currency: createValidCurrency(),
        totals: { amount: 500 },
      });

      const found = await formPaymentModel.findById(created._id);

      expect(found).toBeDefined();
      expect(found?._id.toString()).toBe(created._id.toString());
    });

    it('should find FormPayment by Diadoc document ID', async () => {
      const diadocDocId = 'unique-diadoc-doc-id';
      
      await formPaymentModel.create({
        account: new Types.ObjectId(),
        status: FormPaymentStatus.SIGNING_ORDER,
        currency: createValidCurrency(),
        totals: { amount: 1000 },
        docs: {
          paymentOrderDiadocDocumentId: diadocDocId,
        },
      });

      const found = await formPaymentModel.findOne({
        'docs.paymentOrderDiadocDocumentId': diadocDocId,
      });

      expect(found).toBeDefined();
      expect(found?.docs?.paymentOrderDiadocDocumentId).toBe(diadocDocId);
    });

    it('should find multiple FormPayments by status', async () => {
      await formPaymentModel.create([
        { account: new Types.ObjectId(), status: FormPaymentStatus.SIGNING_ORDER, currency: createValidCurrency(), totals: { amount: 100 } },
        { account: new Types.ObjectId(), status: FormPaymentStatus.SIGNING_ORDER, currency: createValidCurrency(), totals: { amount: 200 } },
        { account: new Types.ObjectId(), status: FormPaymentStatus.DRAFT, currency: createValidCurrency(), totals: { amount: 300 } },
      ]);

      const signingOrders = await formPaymentModel.find({
        status: FormPaymentStatus.SIGNING_ORDER,
      });

      expect(signingOrders.length).toBe(2);
    });
  });

  describe('Update Operations', () => {
    it('should update FormPayment status', async () => {
      const created = await formPaymentModel.create({
        account: new Types.ObjectId(),
        status: FormPaymentStatus.DRAFT,
        currency: createValidCurrency(),
        totals: { amount: 1000 },
      });

      await formPaymentModel.updateOne(
        { _id: created._id },
        { $set: { status: FormPaymentStatus.SIGNING_ORDER } },
      );

      const updated = await formPaymentModel.findById(created._id);
      expect(updated?.status).toBe(FormPaymentStatus.SIGNING_ORDER);
    });

    it('should update Diadoc document ID after sending', async () => {
      const created = await formPaymentModel.create({
        account: new Types.ObjectId(),
        status: FormPaymentStatus.DRAFT,
        currency: createValidCurrency(),
        totals: { amount: 1000 },
      });

      const diadocDocId = 'new-diadoc-doc-id';
      const diadocMsgId = 'new-diadoc-msg-id';

      await formPaymentModel.updateOne(
        { _id: created._id },
        {
          $set: {
            status: FormPaymentStatus.SIGNING_ORDER,
            'docs.paymentOrderDiadocDocumentId': diadocDocId,
            'docs.paymentOrderDiadocMessageId': diadocMsgId,
          },
        },
      );

      const updated = await formPaymentModel.findById(created._id);
      expect(updated?.status).toBe(FormPaymentStatus.SIGNING_ORDER);
      expect(updated?.docs?.paymentOrderDiadocDocumentId).toBe(diadocDocId);
    });

    it('should add signed file reference after signing', async () => {
      const created = await formPaymentModel.create({
        account: new Types.ObjectId(),
        status: FormPaymentStatus.SIGNING_ORDER,
        currency: createValidCurrency(),
        totals: { amount: 1000 },
        docs: {
          paymentOrderDiadocDocumentId: 'doc-123',
        },
      });

      const signedFileId = new Types.ObjectId();

      await formPaymentModel.updateOne(
        { _id: created._id },
        {
          $set: {
            status: FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION,
          },
          $push: {
            'docs.paymentOrderSigned': signedFileId,
          },
        },
      );

      const updated = await formPaymentModel.findById(created._id);
      expect(updated?.status).toBe(FormPaymentStatus.SIGNING_ORDER_WAITING_VERIFICATION);
      expect(updated?.docs?.paymentOrderSigned).toContainEqual(signedFileId);
    });
  });

  describe('Delete Operations', () => {
    it('should delete FormPayment', async () => {
      const created = await formPaymentModel.create({
        account: new Types.ObjectId(),
        status: FormPaymentStatus.DRAFT,
        currency: createValidCurrency(),
        totals: { amount: 1000 },
      });

      await formPaymentModel.deleteOne({ _id: created._id });

      const deleted = await formPaymentModel.findById(created._id);
      expect(deleted).toBeNull();
    });
  });

  describe('Query Performance', () => {
    it('should efficiently query by Diadoc document ID', async () => {
      // Создаём 100 документов
      const docs = Array.from({ length: 100 }, (_, i) => ({
        account: new Types.ObjectId(),
        status: FormPaymentStatus.SIGNING_ORDER,
        currency: createValidCurrency(),
        totals: { amount: 1000 + i },
        docs: {
          paymentOrderDiadocDocumentId: `diadoc-doc-${i}`,
        },
      }));

      await formPaymentModel.insertMany(docs);

      const startTime = Date.now();
      const found = await formPaymentModel.findOne({
        'docs.paymentOrderDiadocDocumentId': 'diadoc-doc-50',
      });
      const endTime = Date.now();

      expect(found).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Должно быть быстро
    });
  });
});
