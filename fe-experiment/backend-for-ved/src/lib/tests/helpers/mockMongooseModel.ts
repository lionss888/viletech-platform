export const createMockModel = (mockCurrenciesDocs: any[]) => {
  const mockExec = jest.fn().mockResolvedValue(mockCurrenciesDocs);
  const mockAggregate = jest.fn().mockReturnValue({ exec: mockExec });
  const mockPopulate = jest.fn().mockReturnValue({ exec: mockExec });

  return {
    find: jest.fn().mockReturnValue({ populate: mockPopulate, exec: mockExec }),
    findOne: jest
      .fn()
      .mockReturnValue({ populate: mockPopulate, exec: jest.fn().mockResolvedValue(mockCurrenciesDocs[0]) }),
    findById: jest
      .fn()
      .mockReturnValue({ populate: mockPopulate, exec: jest.fn().mockResolvedValue(mockCurrenciesDocs[0]) }),
    findOneAndUpdate: jest.fn().mockReturnValue({ populate: mockPopulate, exec: mockExec }),
    deleteMany: jest.fn().mockResolvedValue(true),
    deleteOne: jest.fn().mockResolvedValue(true),
    bulkWrite: jest.fn().mockResolvedValue(true),
    syncIndexes: jest.fn().mockResolvedValue(true),
    countDocuments: jest.fn().mockResolvedValue(mockCurrenciesDocs.length),
    aggregate: mockAggregate,
    create: jest.fn().mockResolvedValue(mockCurrenciesDocs[0]),
    insertMany: jest.fn().mockResolvedValue(mockCurrenciesDocs),
    updateOne: jest.fn().mockResolvedValue(true),
    updateMany: jest.fn().mockResolvedValue(true),
  };
};
