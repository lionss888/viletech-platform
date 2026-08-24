import { Controller, Inject } from '@nestjs/common';
import { ISocketAuthorizedService } from '../service/socket.service.interface';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { SocketPattern } from 'lib/enums/models/socket.enum';
import { IdFieldDto } from 'lib/dto/id-field.dto';
import { IdsFieldDto } from 'lib/dto/ids-field.dto';
import { SOCKET_AUTHORIZED_SERVICE } from '../socket.constants';
import { DisconnectOneDto } from '../dto/disconnect-one.dto';

@Controller()
export class SocketRpcController {
  constructor(@Inject(SOCKET_AUTHORIZED_SERVICE) private readonly service: ISocketAuthorizedService) {}

  @CatcherMessagePattern(SocketPattern.CHECK_ACCOUNT_CONNECTION)
  checkAccountConnection({ _id }: IdFieldDto): boolean {
    return this.service.checkAccountConnection(_id);
  }

  @CatcherMessagePattern(SocketPattern.CHECK_ACCOUNTS_CONNECTION)
  checkAccountsConnection({ _ids }: IdsFieldDto): string[] {
    return this.service.checkAccountsConnection(_ids);
  }

  @CatcherMessagePattern(SocketPattern.DISCONNECT_ONE)
  async disconnectOne(dto: DisconnectOneDto): Promise<void> {
    return await this.service.disconnectOne(dto);
  }
}
