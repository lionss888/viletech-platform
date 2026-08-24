import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Subject } from 'rxjs';
import { IShutdownService } from './shutdown.service.interface';

@Injectable()
export class ShutdownService implements OnApplicationShutdown, IShutdownService {
  private readonly shutdownListener$: Subject<void> = new Subject();
  private readonly logger: Logger = new Logger();

  async onApplicationShutdown() {
    this.logger.error('Application shutdown.');
    process.exit(1);
  }

  subscribeToShutdown(shutdownFn: () => void): void {
    this.shutdownListener$.subscribe(() => shutdownFn());
  }

  async shutdown() {
    this.shutdownListener$.next();
  }
}
