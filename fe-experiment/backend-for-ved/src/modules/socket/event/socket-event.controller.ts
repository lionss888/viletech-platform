import { Controller, Inject } from '@nestjs/common';
import { CatcherExternalEventPattern } from 'lib/decorators/catcher-event-pattern.decorator';
import { SocketMessageDataDto, SocketMessageDto } from 'lib/dto/models/socket-message.dto';
import { ISocketAnonymousService, ISocketAuthorizedService } from '../service/socket.service.interface';
import { SocketEventPattern } from 'lib/enums/models/socket.enum';
import { SOCKET_ANONYMOUS_SERVICE, SOCKET_AUTHORIZED_SERVICE } from '../socket.constants';

@Controller()
export class SocketEventController {
  constructor(
    @Inject(SOCKET_AUTHORIZED_SERVICE) private readonly authorizedService: ISocketAuthorizedService,
    @Inject(SOCKET_ANONYMOUS_SERVICE) private readonly anonymousService: ISocketAnonymousService,
  ) {}

  @CatcherExternalEventPattern(SocketEventPattern.SEND_ONE)
  sendOne(dto: SocketMessageDto) {
    return this.authorizedService.sendOne(dto);
  }

  @CatcherExternalEventPattern(SocketEventPattern.SEND_MANY)
  sendMany(dto: SocketMessageDto[]) {
    return this.authorizedService.sendMany(dto);
  }

  @CatcherExternalEventPattern(SocketEventPattern.BROADCAST_ONE)
  broadcastOne(dto: SocketMessageDataDto) {
    return this.anonymousService.broadcastOne(dto);
  }

  @CatcherExternalEventPattern(SocketEventPattern.BROADCAST_MANY)
  broadcastMany(dto: SocketMessageDataDto[]) {
    return this.anonymousService.broadcastMany(dto);
  }

  @CatcherExternalEventPattern(SocketEventPattern.BROADCAST_MANY_AUTHORIZED)
  broadcastManyAuthorized(dto: SocketMessageDataDto[]) {
    return this.authorizedService.broadcastMany(dto);
  }
}
