export interface IShutdownService {
  shutdown(): Promise<void>;
  subscribeToShutdown(shutdownFn: () => void): void;
}
