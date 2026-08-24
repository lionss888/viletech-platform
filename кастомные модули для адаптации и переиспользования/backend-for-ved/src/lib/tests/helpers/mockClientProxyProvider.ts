type PatternHandlerMap<T = any> = Record<string, (data: any) => Promise<T>>;

export function createMockClientProxyProvider(
  handlers: {
    send?: PatternHandlerMap;
    emit?: PatternHandlerMap;
  },
  provide: string = 'NatsClientProxy',
) {
  const mockClient = {
    send: jest.fn((pattern: any, data: any) => {
      const handler = handlers.send?.[pattern];
      return handler ? handler(data) : Promise.resolve(undefined);
    }),
    emit: jest.fn((pattern: any, data: any) => {
      const handler = handlers.emit?.[pattern];
      return handler ? handler(data) : Promise.resolve(true);
    }),
  };

  return {
    provide,
    useValue: mockClient,
  };
}
