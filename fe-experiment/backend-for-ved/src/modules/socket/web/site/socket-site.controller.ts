import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Inject, Logger, Options, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocketMessageDataDto } from '../../../../lib/dto/models/socket-message.dto';
import { UserMethod } from '../../../../lib/decorators/user-method.decorator';
import { SOCKET_AUTHORIZED_SERVICE } from '../../socket.constants';
import { ISocketAuthorizedService } from '../../service/socket.service.interface';
import { AccountId } from '../../../../lib/decorators/account-id.decorator';
import { plainModelToClass } from '../../../../lib/utils/helpers/entity.helper';
import { NegotiateConnectionResultDto } from '../../dto/negotiate-connection.dto';

@ApiBearerAuth()
@ApiTags('socket-message')
@Controller('socket')
export class SocketSiteController {
  private readonly logger = new Logger(SocketSiteController.name);
  private readonly isSocketLogsEnabled: boolean;

  constructor(
    @Inject(SOCKET_AUTHORIZED_SERVICE) private readonly service: ISocketAuthorizedService,
    private readonly configService: ConfigService,
  ) {
    this.isSocketLogsEnabled = this.configService.get<boolean>('socket.logs.enabled') === true;
  }

  private socketDebug(message: string) {
    if (!this.isSocketLogsEnabled) return;
    this.logger.debug(message);
  }

  @Options('message')
  @ApiOperation({
    summary: 'Подключение без авторизации',
    description: `io('API_URL/socket/anonymous, { path: '/api/1.0/socketio' })`,
  })
  @ApiResponse({ status: 204 })
  joinAnonymous() {}

  @Options('message')
  @ApiOperation({
    summary: 'Подключение с авторизацией',
    description: `io('API_URL/socket/authorized?token=' + token, { path: '/api/1.0/socketio'})`,
  })
  @ApiResponse({ status: 204 })
  joinAuthorized() {}

  @Options('message.created')
  @ApiOperation({ summary: 'Publish.', description: "socket.on('notify', (data) => {})" })
  @ApiResponse({ status: 204, type: SocketMessageDataDto })
  created() {}

  @Post('negotiate-connection')
  @UserMethod({
    summary: 'Получение токена для подключения по вебсокетам',
    response: { status: 201, type: NegotiateConnectionResultDto },
  })
  async negotiateConnection(@AccountId() accountId: string): Promise<NegotiateConnectionResultDto> {
    this.socketDebug(`negotiate-connection called by account: ${accountId}`);
    const model = await this.service.negotiateConnection({ account: accountId });
    this.socketDebug(`negotiate-connection token created for account: ${accountId}`);
    return plainModelToClass(NegotiateConnectionResultDto, model);
  }
}
