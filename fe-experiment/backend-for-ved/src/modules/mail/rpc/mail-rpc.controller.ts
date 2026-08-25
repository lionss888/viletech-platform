import { Controller, Inject, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { RpcValidationFilter } from 'lib/filters/rcp-exceptions.filter';
import { SendAdminsDto, SendUserDto } from '../dto/send.dto';
import { SenderPattern } from 'lib/enums/models/sender.enums';
import { IMailService } from '../service/mail.service.interface';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';

@UsePipes(new ValidationPipe({ transform: true }))
@UseFilters(new RpcValidationFilter())
@Controller()
export class MailRpcController {
  constructor(@Inject('IMailService') private readonly service: IMailService) {}

  @CatcherMessagePattern(SenderPattern.SEND_USER)
  sendUser(dto: SendUserDto): Promise<void> {
    return this.service.send(dto);
  }

  @CatcherMessagePattern(SenderPattern.SEND_ADMINS)
  sendAdmins(dto: SendAdminsDto): Promise<void> {
    return this.service.send({ ...dto, toAdmins: true });
  }
}
