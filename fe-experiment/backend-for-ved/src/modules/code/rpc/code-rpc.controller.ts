import { Controller, Inject } from '@nestjs/common';
import { ICodeService } from '../service/code.service.interface';
import { CodeBaseDto } from 'lib/dto/models/code.dto';
import { CodeCreateDto, CodeCreateManyFullDto } from '../dto/code.create.dto';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { CodePattern } from 'lib/enums/models/code.enums';
import { AccountFieldDto } from 'lib/dto/account-field.dto';

@Controller()
export class CodeRPCController {
  constructor(@Inject('ICodeService') private readonly service: ICodeService) {}

  @CatcherMessagePattern(CodePattern.GENERATE)
  async generate(data: CodeCreateDto): Promise<string> {
    return this.service.generate(data);
  }

  @CatcherMessagePattern(CodePattern.VERIFY)
  async verify(data: CodeBaseDto): Promise<boolean> {
    return this.service.verify(data);
  }

  @CatcherMessagePattern(CodePattern.REMOVE_BY_ACCOUNT)
  async removeCodes(data: AccountFieldDto): Promise<void> {
    await this.service.removeMany(data);
  }

  @CatcherMessagePattern(CodePattern.CREATE_MANY_FULL)
  async createManyFull(data: CodeCreateManyFullDto): Promise<void> {
    await this.service.createManyFull(data);
  }
}
