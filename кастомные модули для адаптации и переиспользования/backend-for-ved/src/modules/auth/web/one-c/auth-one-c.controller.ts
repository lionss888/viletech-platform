import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { LoginAdminDto } from 'modules/auth/dto/login.dto';
import { TokenDto } from '../../dto/token.dto';
import { AuthDto } from '../../dto/auth.dto';
import { IAuthService } from '../../service/auth.service.interface';
import { IAuth } from 'lib/interfaces/models/auth.interface';
import { Method } from 'lib/decorators/method.decorator';
import { ApiNotFoundMessagesResponse } from '../../../../lib/decorators/api-not-found-messages-response.decorator';
import { ApiBadRequestMessagesResponse } from '../../../../lib/decorators/api-bad-request-messages-response.decorator';

@ApiCookieAuth()
@ApiTags('1C auth')
@Controller('1c/auth')
export class AuthOneCController {
  constructor(@Inject('IAuthService') private readonly service: IAuthService) {}

  @Post('login')
  @ApiBadRequestMessagesResponse(['Many requests login, try later.', 'Incorrect password.'])
  @ApiNotFoundMessagesResponse(['Account not found.'])
  @Method({ response: { status: 201, type: AuthDto }, summary: 'Аутентификация пользователя по логину и паролю' })
  loginAdmin(@Body() dto: LoginAdminDto): Promise<IAuth> {
    return this.service.login(dto);
  }

  @Post('refresh-token')
  @Method({ response: { status: 201, type: AuthDto }, summary: 'Обновление токена доступа' })
  refreshToken(@Body() dto: TokenDto): Promise<IAuth> {
    return this.service.refreshToken(dto);
  }
}
