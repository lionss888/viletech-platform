import { Controller, Inject } from '@nestjs/common';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { IAuthService } from '../service/auth.service.interface';
import { AuthPattern } from 'lib/enums/models/auth.enums';
import { IAuth } from 'lib/interfaces/models/auth.interface';
import { TemporaryTokenDto } from '../dto/temporary-token.dto';
import { TokenDto } from '../dto/token.dto';

@Controller()
export class AuthRPCController {
  constructor(@Inject('IAuthService') private readonly service: IAuthService) {}

  @CatcherMessagePattern(AuthPattern.VERIFY_ACCOUNT_BY_TOKEN)
  verifyByToken(dto: TemporaryTokenDto): Promise<IAuth> {
    return this.service.verifyByToken(dto);
  }

  @CatcherMessagePattern(AuthPattern.VERIFY_CRYPTO_ACCOUNT_BY_TOKEN)
  verifyCryptoByToken(dto: TokenDto): Promise<any> {
    return this.service.cryptoAuthMe(dto);
  }
}
