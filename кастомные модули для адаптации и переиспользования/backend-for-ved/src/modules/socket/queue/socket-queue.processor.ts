import { Inject, Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { ISocketAnonymousService, ISocketAuthorizedService } from '../service/socket.service.interface';
import { SOCKET_ANONYMOUS_SERVICE, SOCKET_AUTHORIZED_SERVICE } from '../socket.constants';
import { SocketQueue } from 'lib/enums/models/socket.enum';
import { JobQueueName } from '../../../lib/enums/models/job-queue.enums';
import { ConfigService } from '@nestjs/config';

@Processor(JobQueueName.SOCKET_QUEUE)
export class SocketQueueProcessor {
  private readonly logger: Logger = new Logger(SocketQueueProcessor.name);
  private readonly isSocketLogsEnabled: boolean;

  constructor(
    @Inject(SOCKET_AUTHORIZED_SERVICE) private readonly authorizedService: ISocketAuthorizedService,
    @Inject(SOCKET_ANONYMOUS_SERVICE) private readonly anonymousService: ISocketAnonymousService,
    private readonly configService: ConfigService,
  ) {
    this.isSocketLogsEnabled = this.configService.get<boolean>('socket.logs.enabled') === true;
  }

  private socketDebug(message: string) {
    if (!this.isSocketLogsEnabled) return;
    this.logger.debug(message);
  }

  @Process(SocketQueue.SEND_ONE)
  async handleTranscode(job: Job) {
    const accountId = job.data.socketMessage?.account;
    const payload = job.data.socketMessage?.data?.payload;
    const eventType = payload && typeof payload === 'object' && 'eventType' in payload ? payload.eventType : 'N/A';

    this.socketDebug(`Processing socket SEND_ONE: jobId=${job.id}, account=${accountId}, eventType=${eventType}`);

    await this.authorizedService.sendSocket(job.data.socketMessage).catch((err) => {
      this.logger.error(`Error sending socket: jobId=${job.id}, account=${accountId}, error=${err.message}`, err.stack);
    });

    this.socketDebug(`Socket SEND_ONE processed successfully: jobId=${job.id}, account=${accountId}`);
  }

  @Process(SocketQueue.BROADCAST_ONE)
  async handleBroadcast(job: Job) {
    await this.anonymousService.broadcast(job.data.socketMessage).catch((err) => this.logger.error(err));
  }

  @Process(SocketQueue.BROADCAST_ONE_AUTHORIZED)
  async handleBroadcastAuthorized(job: Job) {
    await this.authorizedService.broadcast(job.data.socketMessage).catch((err) => this.logger.error(err));
  }
}
