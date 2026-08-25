export function createMockConfigService(overrides: Record<string, any> = {}) {
  return {
    get: jest.fn((key: string) => {
      return key in overrides ? overrides[key] : undefined;
    }),
  };
}
