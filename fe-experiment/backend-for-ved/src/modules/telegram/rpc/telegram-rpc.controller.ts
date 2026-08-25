import { Controller, Inject, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { RpcValidationFilter } from '../../../lib/filters/rcp-exceptions.filter';
import { ITelegramService } from '../service/telegram.service.interface';
import { SenderTelegramPattern } from '../../../lib/enums/models/sender.enums';
import { TelegramSendDto } from '../dto/telegram-send.dto';
import { CatcherMessagePattern } from '../../../lib/decorators/catcher-message-pattern.decorator';

@UsePipes(new ValidationPipe({ transform: true }))
@UseFilters(new RpcValidationFilter())
@Controller()
export class TelegramRpcController {
  constructor(@Inject('ITelegramService') private readonly service: ITelegramService) {}

  @CatcherMessagePattern(SenderTelegramPattern.SEND)
  send(dto: TelegramSendDto): Promise<void> {
    return this.service.send(dto);
  }
}
