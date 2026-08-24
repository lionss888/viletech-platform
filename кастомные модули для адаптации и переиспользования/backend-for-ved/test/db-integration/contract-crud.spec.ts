/**
 * Database Integration Tests: Contract CRUD
 * 
 * Эти тесты проверяют реальную работу с базой данных для контрактов.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Contract, ContractSchema } from '../../src/modules/contract/service/contract.schema';
import { ContractStatus } from '../../src/lib/enums/models/contract.enums';

describe('Database Integration: Contract CRUD', () => {
  let mongod: MongoMemoryServer;
  let moduleRef: TestingModule;
  let contractModel: Model<Contract>;

  jest.setTimeout(60000);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: Contract.name, schema: ContractSchema },
        ]),
      ],
    }).compile();

    contractModel = moduleRef.get<Model<Contract>>(getModelToken(Contract.name));
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
    if (contractModel) {
      await contractModel.deleteMany({});
    }
  });

  describe('Create Operations', () => {
    it('should create Contract document', async () => {
      const contractData = {
        account: new Types.ObjectId(),
        status: ContractStatus.CREATED,
        file: new Types.ObjectId(),
        isTemplate: false,
      };

      const created = await contractModel.create(contractData);

      expect(created._id).toBeDefined();
      expect(created.status).toBe(ContractStatus.CREATED);
    });

    it('should create Contract with Diadoc fields', async () => {
      const contractData = {
        account: new Types.ObjectId(),
        status: ContractStatus.CREATED,
        file: new Types.ObjectId(),
        isTemplate: false,
        diadocDocumentId: 'contract-diadoc-123',
        diadocMessageId: 'contract-msg-456',
        signatureType: 'diadoc',
      };

      const created = await contractModel.create(contractData);

      expect(created.diadocDocumentId).toBe('contract-diadoc-123');
      expect(created.signatureType).toBe('diadoc');
    });
  });

  describe('Read Operations', () => {
    it('should find Contract by Diadoc document ID', async () => {
      const diadocDocId = 'unique-contract-diadoc-id';
      
      await contractModel.create({
        account: new Types.ObjectId(),
        status: ContractStatus.CREATED,
        file: new Types.ObjectId(),
        isTemplate: false,
        diadocDocumentId: diadocDocId,
      });

      const found = await contractModel.findOne({
        diadocDocumentId: diadocDocId,
      });

      expect(found).toBeDefined();
      expect(found?.diadocDocumentId).toBe(diadocDocId);
    });

    it('should find contracts pending Diadoc signing', async () => {
      await contractModel.create([
        {
          account: new Types.ObjectId(),
          status: ContractStatus.CREATED,
          file: new Types.ObjectId(),
          isTemplate: false,
          diadocDocumentId: 'pending-1',
          signatureType: 'diadoc',
        },
        {
          account: new Types.ObjectId(),
          status: ContractStatus.CREATED,
          file: new Types.ObjectId(),
          isTemplate: false,
          diadocDocumentId: 'pending-2',
          signatureType: 'diadoc',
        },
        {
          account: new Types.ObjectId(),
          status: ContractStatus.ACCEPTED,
          file: new Types.ObjectId(),
          isTemplate: false,
          signatureType: 'manual',
        },
      ]);

      const pendingDiadoc = await contractModel.find({
        diadocDocumentId: { $exists: true, $ne: null },
        signatureType: 'diadoc',
        status: { $ne: ContractStatus.ACCEPTED },
      });

      expect(pendingDiadoc.length).toBe(2);
    });
  });

  describe('Update Operations', () => {
    it('should update Contract status after Diadoc signing', async () => {
      const created = await contractModel.create({
        account: new Types.ObjectId(),
        status: ContractStatus.CREATED,
        file: new Types.ObjectId(),
        isTemplate: false,
        diadocDocumentId: 'to-be-signed',
        signatureType: 'diadoc',
      });

      await contractModel.updateOne(
        { _id: created._id },
        {
          $set: {
            status: ContractStatus.ACCEPTED,
            diadocSignedAt: new Date(),
          },
        },
      );

      const updated = await contractModel.findById(created._id);
      expect(updated?.status).toBe(ContractStatus.ACCEPTED);
      expect(updated?.diadocSignedAt).toBeDefined();
    });

    it('should update Contract status on rejection', async () => {
      const created = await contractModel.create({
        account: new Types.ObjectId(),
        status: ContractStatus.CREATED,
        file: new Types.ObjectId(),
        isTemplate: false,
        diadocDocumentId: 'to-be-rejected',
        signatureType: 'diadoc',
      });

      // Note: diadocRejectedAt and diadocRejectionReason are stored as raw fields
      // since they are not in the schema, MongoDB will still store them
      await contractModel.updateOne(
        { _id: created._id },
        {
          $set: {
            status: ContractStatus.REJECTED,
            rejectText: 'Invalid terms',
          },
        },
      );

      const updated = await contractModel.findById(created._id);
      expect(updated?.status).toBe(ContractStatus.REJECTED);
      expect(updated?.rejectText).toBe('Invalid terms');
    });
  });
});
