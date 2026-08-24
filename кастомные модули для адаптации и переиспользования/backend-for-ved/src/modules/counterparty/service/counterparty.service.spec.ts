import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CounterpartyService } from './counterparty.service';
import { Counterparty } from './counterparty.schema';
import { FormPayment } from '../../form-payment/service/form-payment.schema';
import { Types } from 'mongoose';
import { CounterpartyApprovalStatus, CounterpartyType } from 'lib/enums/models/counterparty.enums';
import { FormPaymentStage, FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { createMockModel } from 'lib/tests/helpers/mockMongooseModel';
import { mockMongooseDoc } from 'lib/tests/helpers/mockMongooseDoc';
import { AccountRole } from 'lib/enums/models/account.enums';

describe('CounterpartyService - Requests History', () => {
  let service: CounterpartyService;
  let mockCounterpartyModel: any;
  let mockFormPaymentModel: any;
  let mockExec: jest.Mock;
  let mockPopulate: jest.Mock;

  const mockCounterparty = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    clientOrganization: '507f1f77bcf86cd799439012',
    name: 'Test Counterparty Ltd',
    country: 'Germany',
    inn: undefined,
    type: CounterpartyType.FOREIGN,
    banks: [],
    lastApprovalStatus: CounterpartyApprovalStatus.APPROVED,
    lastApprovalDate: new Date('2025-10-01'),
    formPayments: ['fp1', 'fp2', 'fp3'],
    isActive: true,
    toString: () => '507f1f77bcf86cd799439011',
  };

  beforeEach(async () => {
    const mockCounterpartyDoc = mockMongooseDoc([mockCounterparty]);

    // Create proper mock chain for findOne().populate().exec()
    mockExec = jest.fn().mockResolvedValue(mockCounterpartyDoc[0]);
    mockPopulate = jest.fn().mockReturnValue({ exec: mockExec });
    const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate, exec: mockExec });

    mockCounterpartyModel = {
      ...createMockModel(mockCounterpartyDoc),
      findOne: jest.fn().mockReturnValue({
        populate: mockPopulate,
        select: mockSelect,
        exec: mockExec
      }),
    };

    mockFormPaymentModel = {
      find: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn(),
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounterpartyService,
        {
          provide: getModelToken(Counterparty.name),
          useValue: mockCounterpartyModel,
        },
        {
          provide: getModelToken(FormPayment.name),
          useValue: mockFormPaymentModel,
        },
      ],
    }).compile();

    service = module.get<CounterpartyService>(CounterpartyService);
  });

  describe('getCounterpartyRequests', () => {
    it('should return requests with statistics (no filters)', async () => {
      // Arrange
      const mockStatistics = [
        { _id: null, pending: 2, approved: 3, rejected: 1, other: 1 },
      ];
      mockFormPaymentModel.aggregate.mockResolvedValue(mockStatistics);

      const mockRequests = [
        {
          _id: 'fp1',
          uid: 1001,
          status: FormPaymentStatus.FORM_ACCEPTED,
          stage: FormPaymentStage.AGENCY_CONTRACT,
          direction: 'export',
          createDate: new Date('2025-11-01'),
        },
        {
          _id: 'fp2',
          uid: 1002,
          status: FormPaymentStatus.FORM_VERIFICATION,
          stage: FormPaymentStage.FORM_VERIFICATION,
          direction: 'import',
          createDate: new Date('2025-10-25'),
        },
      ];
      mockFormPaymentModel.lean.mockResolvedValue(mockRequests);

      // Act
      const result = await service.getCounterpartyRequests(mockCounterparty._id.toString(), {
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.counterparty).toEqual({
        _id: mockCounterparty._id.toString(),
        name: mockCounterparty.name,
        country: mockCounterparty.country,
        inn: mockCounterparty.inn,
      });
      expect(result.statistics).toEqual({ _id: null, pending: 2, approved: 3, rejected: 1, other: 1 });
      expect(result.items).toHaveLength(2);
      expect(result.hasNext).toBe(false);
    });

    it('should filter by category=approved', async () => {
      // Arrange
      mockFormPaymentModel.aggregate.mockResolvedValue([
        { _id: null, pending: 0, approved: 3, rejected: 0, other: 0 },
      ]);

      const approvedRequests = [
        {
          _id: 'fp1',
          status: FormPaymentStatus.FORM_ACCEPTED,
          stage: FormPaymentStage.AGENCY_CONTRACT,
        },
      ];
      mockFormPaymentModel.lean.mockResolvedValue(approvedRequests);

      // Act
      const result = await service.getCounterpartyRequests(mockCounterparty._id.toString(), {
        category: ['approved'],
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.items).toHaveLength(1);
      expect(mockFormPaymentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          counterpartyRef: expect.any(Types.ObjectId),
          $and: expect.arrayContaining([
            { stage: expect.objectContaining({ $in: expect.any(Array) }) },
            { status: expect.objectContaining({ $nin: expect.any(Array) }) },
          ]),
        }),
      );
    });

    it('should filter by multiple categories (pending,approved)', async () => {
      // Arrange
      mockFormPaymentModel.aggregate.mockResolvedValue([
        { _id: null, pending: 2, approved: 3, rejected: 0, other: 0 },
      ]);
      mockFormPaymentModel.lean.mockResolvedValue([]);

      // Act
      const result = await service.getCounterpartyRequests(mockCounterparty._id.toString(), {
        category: ['pending', 'approved'],
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.statistics.pending).toBe(2);
      expect(result.statistics.approved).toBe(3);
      expect(mockFormPaymentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          counterpartyRef: expect.any(Types.ObjectId),
          $and: expect.arrayContaining([
            expect.objectContaining({
              $or: expect.arrayContaining([
                { status: expect.objectContaining({ $in: expect.any(Array) }) },
                expect.objectContaining({ $and: expect.any(Array) }),
              ]),
            }),
          ]),
        }),
      );
    });

    it('should filter by direction', async () => {
      // Arrange
      mockFormPaymentModel.aggregate.mockResolvedValue([
        { _id: null, pending: 0, approved: 2, rejected: 0, other: 0 },
      ]);
      mockFormPaymentModel.lean.mockResolvedValue([]);

      // Act
      await service.getCounterpartyRequests(mockCounterparty._id.toString(), {
        direction: ['export'],
        page: 1,
        limit: 20,
      });

      // Assert
      expect(mockFormPaymentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          counterpartyRef: expect.any(Types.ObjectId),
          direction: 'export',
        }),
      );
    });

    it('should filter by currencies', async () => {
      // Arrange
      mockFormPaymentModel.aggregate.mockResolvedValue([
        { _id: null, pending: 0, approved: 1, rejected: 0, other: 0 },
      ]);
      mockFormPaymentModel.lean.mockResolvedValue([]);

      // Act
      await service.getCounterpartyRequests(mockCounterparty._id.toString(), {
        clientCurrency: ['rub'],
        counterpartyCurrency: ['usd'],
        page: 1,
        limit: 20,
      });

      // Assert
      expect(mockFormPaymentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          counterpartyRef: expect.any(Types.ObjectId),
          'currency.client': 'rub',
          'currency.counterparty': 'usd',
        }),
      );
    });

    it('should filter by date range', async () => {
      // Arrange
      mockFormPaymentModel.aggregate.mockResolvedValue([
        { _id: null, pending: 0, approved: 1, rejected: 0, other: 0 },
      ]);
      mockFormPaymentModel.lean.mockResolvedValue([]);

      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-12-31');

      // Act
      await service.getCounterpartyRequests(mockCounterparty._id.toString(), {
        dateFrom,
        dateTo,
        page: 1,
        limit: 20,
      });

      // Assert
      expect(mockFormPaymentModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          counterpartyRef: expect.any(Types.ObjectId),
          createDate: {
            $gte: dateFrom,
            $lte: dateTo,
          },
        }),
      );
    });

    it('should implement pagination correctly', async () => {
      // Arrange
      mockFormPaymentModel.aggregate.mockResolvedValue([
        { _id: null, pending: 0, approved: 5, rejected: 0, other: 0 },
      ]);

      // Return 3 items (limit+1) to indicate hasNext
      const mockRequests = [
        { _id: 'fp1', uid: 1001 },
        { _id: 'fp2', uid: 1002 },
        { _id: 'fp3', uid: 1003 },
      ];
      mockFormPaymentModel.lean.mockResolvedValue(mockRequests);

      // Act
      const result = await service.getCounterpartyRequests(mockCounterparty._id.toString(), {
        page: 1,
        limit: 2,
      });

      // Assert
      expect(mockFormPaymentModel.skip).toHaveBeenCalledWith(0); // (1-1) * 2
      expect(mockFormPaymentModel.limit).toHaveBeenCalledWith(3); // limit + 1
      expect(result.items).toHaveLength(2); // Trimmed to limit
      expect(result.hasNext).toBe(true); // Because we got limit+1 items
    });

    it('should calculate statistics correctly for all categories', async () => {
      // Arrange

      const mockStatistics = [
        { _id: null, pending: 5, approved: 10, rejected: 3, other: 2 },
      ];
      mockFormPaymentModel.aggregate.mockResolvedValue(mockStatistics);
      mockFormPaymentModel.lean.mockResolvedValue([]);

      // Act
      const result = await service.getCounterpartyRequests(mockCounterparty._id.toString(), {
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.statistics).toEqual({
        _id: null,
        pending: 5,
        approved: 10,
        rejected: 3,
        other: 2,
      });

      // Verify statistics are calculated independently of filters
      expect(mockFormPaymentModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $match: {
              counterpartyRef: expect.any(Types.ObjectId),
            },
          }),
        ]),
      );
    });

    it('should throw NotFoundException when counterparty not found', async () => {
      // Arrange
      mockExec.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        service.getCounterpartyRequests('nonexistent-id', { page: 1, limit: 20 }),
      ).rejects.toThrow();
    });
  });

  describe('buildRequestsMatchQuery (via getCounterpartyRequests)', () => {
    it('should build query with all filter combinations', async () => {
      // Arrange
      mockFormPaymentModel.aggregate.mockResolvedValue([{ _id: null, pending: 0, approved: 0, rejected: 0, other: 0 }]);
      mockFormPaymentModel.lean.mockResolvedValue([]);

      // Act
      await service.getCounterpartyRequests(mockCounterparty._id.toString(), {
        category: ['pending', 'approved'],
        direction: ['export'],
        clientCurrency: ['rub'],
        counterpartyCurrency: ['usd', 'eur'],
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-12-31'),
        page: 1,
        limit: 20,
      });

      // Assert
      const callArgs = mockFormPaymentModel.find.mock.calls[0][0];
      expect(callArgs.counterpartyRef).toBeDefined();
      expect(callArgs.direction).toBe('export');
      expect(callArgs['currency.client']).toBe('rub');
      expect(callArgs['currency.counterparty']).toEqual({ $in: ['usd', 'eur'] });
      expect(callArgs.createDate).toEqual({
        $gte: new Date('2025-01-01'),
        $lte: new Date('2025-12-31'),
      });
      expect(callArgs.$and).toBeDefined();
    });
  });
});

describe('CounterpartyService - listForAccount', () => {
  let service: CounterpartyService;
  let mockCounterpartyModel: any;
  let mockFormPaymentModel: any;
  let rawDocs: any[];

  beforeEach(async () => {
    rawDocs = [
      { _id: new Types.ObjectId('65a6f2e6f7a1e0f1d4ab0001'), name: 'Counterparty 1', createdBy: 'user1' },
      { _id: new Types.ObjectId('65a6f2e6f7a1e0f1d4ab0002'), name: 'Counterparty 2', createdBy: 'user1' },
    ];

    const docsWithToJSON = rawDocs.map((doc) => ({
      ...doc,
      toJSON: () => ({
        _id: doc._id.toString(),
        name: doc.name,
        createdBy: doc.createdBy,
      }),
    }));

    mockCounterpartyModel = {
      hasNextPaginate: jest.fn().mockResolvedValue({
        docs: docsWithToJSON,
        hasNext: false,
        limit: 20,
        page: 1,
        offset: 0,
      }),
    };

    mockFormPaymentModel = {
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounterpartyService,
        {
          provide: getModelToken(Counterparty.name),
          useValue: mockCounterpartyModel,
        },
        {
          provide: getModelToken(FormPayment.name),
          useValue: mockFormPaymentModel,
        },
      ],
    }).compile();

    service = module.get<CounterpartyService>(CounterpartyService);
  });

  it('should include statistics for each counterparty in the list response', async () => {
    mockFormPaymentModel.aggregate
      .mockResolvedValueOnce([
        { _id: rawDocs[0]._id, pending: 3, approved: 1, rejected: 0 },
        { _id: rawDocs[1]._id, pending: 0, approved: 2, rejected: 5 },
      ])
      .mockResolvedValueOnce([{ _id: null, pending: 3, approved: 3, rejected: 5 }]);

    const result = await service.listForAccount({ _id: 'user1', role: AccountRole.USER }, {});

    expect(result.docs).toHaveLength(2);
    expect(result.docs[0].statistics).toEqual({ pending: 3, approved: 1, rejected: 0 });
    expect(result.docs[1].statistics).toEqual({ pending: 0, approved: 2, rejected: 5 });
    expect(result.statistics).toEqual({ pending: 3, approved: 3, rejected: 5 });
    expect(mockFormPaymentModel.aggregate).toHaveBeenCalledTimes(2);
  });

  it('should fallback to zero statistics when aggregation returns no data', async () => {
    mockFormPaymentModel.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const result = await service.listForAccount({ _id: 'user1', role: AccountRole.USER }, {});

    expect(result.docs).toHaveLength(2);
    expect(result.docs[0].statistics).toEqual({ pending: 0, approved: 0, rejected: 0 });
    expect(result.docs[1].statistics).toEqual({ pending: 0, approved: 0, rejected: 0 });
    expect(result.statistics).toEqual({ pending: 0, approved: 0, rejected: 0 });
  });
});

describe('CounterpartyService - findBasicByIds', () => {
  let service: CounterpartyService;
  let mockCounterpartyModel: any;
  let mockExec: jest.Mock;
  let mockLean: jest.Mock;
  let mockFind: jest.Mock;

  beforeEach(async () => {
    mockExec = jest.fn();
    mockLean = jest.fn().mockReturnValue({ exec: mockExec });
    mockFind = jest.fn().mockReturnValue({ lean: mockLean });

    mockCounterpartyModel = {
      find: mockFind,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounterpartyService,
        {
          provide: getModelToken(Counterparty.name),
          useValue: mockCounterpartyModel,
        },
        {
          provide: getModelToken(FormPayment.name),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<CounterpartyService>(CounterpartyService);
  });

  describe('Basic Functionality', () => {
    it('should return counterparties with correct projection fields', async () => {
      const mockDocs = [
        {
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          name: 'Test Counterparty',
          country: 'Germany',
          legalAddress: 'Berlin Street 1',
          banks: [
            {
              uuid: 'bank1',
              bankName: 'Deutsche Bank',
              accounts: [],
            },
          ],
        },
      ];
      mockExec.mockResolvedValue(mockDocs);

      const result = await service.findBasicByIds(['507f1f77bcf86cd799439011']);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'Test Counterparty',
        country: 'Germany',
        legalAddress: 'Berlin Street 1',
      });
      expect(result[0].banks).toHaveLength(1);
    });

    it('should use projection to fetch only required fields', async () => {
      mockExec.mockResolvedValue([]);

      await service.findBasicByIds(['507f1f77bcf86cd799439011']);

      expect(mockFind).toHaveBeenCalledWith(
        expect.any(Object),
        {
          name: 1,
          country: 1,
          legalAddress: 1,
          banks: 1,
        },
      );
    });

    it('should filter only isActive: true counterparties', async () => {
      mockExec.mockResolvedValue([]);

      await service.findBasicByIds(['507f1f77bcf86cd799439011']);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          isActive: true,
        }),
        expect.any(Object),
      );
    });

    it('should use lean() for performance', async () => {
      mockExec.mockResolvedValue([]);

      await service.findBasicByIds(['507f1f77bcf86cd799439011']);

      expect(mockLean).toHaveBeenCalled();
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate duplicate IDs before query', async () => {
      mockExec.mockResolvedValue([
        {
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          name: 'Test CP',
          country: 'DE',
          banks: [],
        },
      ]);

      const duplicateIds = [
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439011',
      ];

      await service.findBasicByIds(duplicateIds);

      const callArgs = mockFind.mock.calls[0][0];
      expect(callArgs._id.$in).toHaveLength(1);
      expect(callArgs._id.$in).toEqual(['507f1f77bcf86cd799439011']);
    });

    it('should deduplicate multiple identical IDs', async () => {
      mockExec.mockResolvedValue([]);

      const ids = ['id1', 'id2', 'id1', 'id3', 'id2', 'id1'];

      await service.findBasicByIds(ids);

      const callArgs = mockFind.mock.calls[0][0];
      expect(callArgs._id.$in).toHaveLength(3);
      expect(callArgs._id.$in).toEqual(expect.arrayContaining(['id1', 'id2', 'id3']));
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array when input is empty array', async () => {
      const result = await service.findBasicByIds([]);

      expect(result).toEqual([]);
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should return empty array when input is null', async () => {
      const result = await service.findBasicByIds(null as any);

      expect(result).toEqual([]);
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should return empty array when input is undefined', async () => {
      const result = await service.findBasicByIds(undefined as any);

      expect(result).toEqual([]);
      expect(mockFind).not.toHaveBeenCalled();
    });

    it('should return empty array when no counterparties found', async () => {
      mockExec.mockResolvedValue([]);

      const result = await service.findBasicByIds(['nonexistent-id']);

      expect(result).toEqual([]);
    });

    it('should handle mix of valid and invalid IDs', async () => {
      const mockDocs = [
        {
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          name: 'Valid CP',
          country: 'DE',
          banks: [],
        },
      ];
      mockExec.mockResolvedValue(mockDocs);

      const result = await service.findBasicByIds([
        '507f1f77bcf86cd799439011',
        'invalid-id',
        'another-invalid',
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Valid CP');
    });

    it('should filter out inactive counterparties', async () => {
      mockExec.mockResolvedValue([
        {
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          name: 'Active CP',
          country: 'DE',
          banks: [],
        },
      ]);

      await service.findBasicByIds([
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
      ]);

      const callArgs = mockFind.mock.calls[0][0];
      expect(callArgs.isActive).toBe(true);
    });
  });

  describe('Performance Characteristics', () => {
    it('should make only one database query regardless of array size', async () => {
      mockExec.mockResolvedValue([]);

      const manyIds = Array.from({ length: 100 }, (_, i) => `id-${i}`);

      await service.findBasicByIds(manyIds);

      expect(mockFind).toHaveBeenCalledTimes(1);
      expect(mockLean).toHaveBeenCalledTimes(1);
      expect(mockExec).toHaveBeenCalledTimes(1);
    });

    it('should not fetch unnecessary fields (no populate, no full doc)', async () => {
      mockExec.mockResolvedValue([]);

      await service.findBasicByIds(['507f1f77bcf86cd799439011']);

      // Verify projection excludes fields like: formPayments, statusHistory, etc.
      const projectionArg = mockFind.mock.calls[0][1];
      expect(Object.keys(projectionArg)).toEqual(['name', 'country', 'legalAddress', 'banks']);
      expect(projectionArg.formPayments).toBeUndefined();
      expect(projectionArg.statusHistory).toBeUndefined();
    });

    it('should return lean documents (no Mongoose wrappers)', async () => {
      const plainObject = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        name: 'Test',
        country: 'DE',
        banks: [],
      };
      mockExec.mockResolvedValue([plainObject]);

      const result = await service.findBasicByIds(['507f1f77bcf86cd799439011']);

      expect(mockLean).toHaveBeenCalled();
      expect(result[0]).toEqual(plainObject);
    });
  });
});

describe('CounterpartyService - Requests Statistics', () => {
  let service: CounterpartyService;
  let mockFormPaymentModel: any;

  beforeEach(async () => {
    mockFormPaymentModel = {
      aggregate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounterpartyService,
        {
          provide: getModelToken(Counterparty.name),
          useValue: createMockModel([]),
        },
        {
          provide: getModelToken(FormPayment.name),
          useValue: mockFormPaymentModel,
        },
      ],
    }).compile();

    service = module.get<CounterpartyService>(CounterpartyService);
  });

  describe('getExternalComplianceStatistics', () => {
    it('should return aggregated counts', async () => {
      mockFormPaymentModel.aggregate.mockResolvedValue([
        { pending: 5, approved: 7, rejected: 2 },
      ]);

      const stats = await service.getExternalComplianceStatistics();

      expect(stats).toEqual({ pending: 5, approved: 7, rejected: 2 });
      expect(mockFormPaymentModel.aggregate).toHaveBeenCalledTimes(1);
    });

    it('should return zeroed counts when aggregation empty', async () => {
      mockFormPaymentModel.aggregate.mockResolvedValue([]);

      const stats = await service.getExternalComplianceStatistics();

      expect(stats).toEqual({ pending: 0, approved: 0, rejected: 0 });
    });
  });
});
