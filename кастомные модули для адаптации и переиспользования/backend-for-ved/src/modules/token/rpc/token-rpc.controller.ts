import { Controller, Inject } from '@nestjs/common';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { ITokenService } from '../service/token.service.interface';
import { TokenQueryDto } from '../dto/token.query.dto';
import { TokenCreateDto } from '../dto/token.create.dto';
import { TokenPattern } from 'lib/enums/models/token.enums';
import { IToken } from 'lib/interfaces/models/token.interface';
import { TokenDeleteDto } from '../dto/token.delete.dto';

@Controller()
export class TokenRPCController {
  constructor(@Inject('ITokenService') private readonly service: ITokenService) {}

  @CatcherMessagePattern(TokenPattern.CREATE)
  create(dto: TokenCreateDto): Promise<IToken> {
    return this.service.create(dto);
  }

  @CatcherMessagePattern(TokenPattern.FIND_ONE)
  findOne(dto: TokenQueryDto): Promise<IToken> {
    return this.service.findOne(dto);
  }

  @CatcherMessagePattern(TokenPattern.DELETE)
  delete(dto: TokenDeleteDto): Promise<void> {
    return this.service.delete(dto);
  }
}
