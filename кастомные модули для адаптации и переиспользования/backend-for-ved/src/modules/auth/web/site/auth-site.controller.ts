import { Body, Controller, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { LoginAdminDto } from 'modules/auth/dto/login.dto';
import { Request, Response } from 'express';
import { TokenDto } from '../../dto/token.dto';
import { AuthDto } from '../../dto/auth.dto';
import { IAuthService } from '../../service/auth.service.interface';
import { IAuth } from 'lib/interfaces/models/auth.interface';
import { Method } from 'lib/decorators/method.decorator';
import { AuthGuard } from 'lib/guards/auth.guard';
import { ConfirmRegistrationDto, RegistrationDto } from '../../dto/registration.dto';
import { EmailFieldDto } from '../../../../lib/dto/email-field.dto';
import { ApiNotFoundMessagesResponse } from '../../../../lib/decorators/api-not-found-messages-response.decorator';
import { ApiBadRequestMessagesResponse } from '../../../../lib/decorators/api-bad-request-messages-response.decorator';
import { ConfirmRestoreDto } from '../../dto/confirm-restore.dto';

@ApiCookieAuth()
@ApiTags('auth')
@Controller('auth')
export class AuthSiteController {
  constructor(@Inject('IAuthService') private readonly service: IAuthService) {}

  @Post('registration')
  @ApiBadRequestMessagesResponse(['Account exist.'])
  async registration(@Body() dto: RegistrationDto, @Res() res: Response): Promise<void> {
    await this.service.registration(dto);
    res.sendStatus(200);
  }

  @Post('registration/re-send')
  @ApiBadRequestMessagesResponse(['Account already activated.'])
  @ApiNotFoundMessagesResponse(['Account not found.'])
  async registrationReSend(@Body() dto: EmailFieldDto, @Res() res: Response): Promise<void> {
    await this.service.reSendCode(dto);
    res.sendStatus(200);
  }

  @Post('registration/confirm')
  @ApiBadRequestMessagesResponse(['Many attempts, try later.', 'Code is not valid.'])
  @ApiNotFoundMessagesResponse(['Account not found.'])
  @Method({ response: { status: 201, type: AuthDto } })
  confirmRegistration(@Body() dto: ConfirmRegistrationDto): Promise<IAuth> {
    return this.service.confirmRegistration(dto);
  }

  @Post('login')
  @ApiBadRequestMessagesResponse(['Many requests login, try later.', 'Incorrect password.'])
  @ApiNotFoundMessagesResponse(['Account not found.'])
  @Method({ response: { status: 201, type: AuthDto } })
  loginAdmin(@Body() dto: LoginAdminDto): Promise<IAuth> {
    return this.service.login(dto);
  }

  @Post('restore')
  @ApiNotFoundMessagesResponse(['Account not found.'])
  @Method({ response: { status: 200 } })
  restore(@Body() dto: EmailFieldDto): Promise<void> {
    return this.service.restore(dto);
  }

  @Post('confirm/restore')
  @ApiBadRequestMessagesResponse(['Many attempts, try later.', 'Code is not valid.'])
  @ApiNotFoundMessagesResponse(['Account not found.'])
  @Method({ response: { status: 201, type: AuthDto } })
  async confirmRestore(@Body() dto: ConfirmRestoreDto): Promise<IAuth> {
    return this.service.restoreConfirm(dto);
  }

  // @Post('login-external')
  // @UserExternalMethod({ response: { status: 201, type: AuthDto } })
  // loginCryptoAuth(@Req() req: Request): Promise<IAuth> {
  //   return this.service.loginCryptoAuth(req.account);
  // }

  @Post('logout')
  @UseGuards(AuthGuard)
  @Method({ response: { status: 200 } })
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.service.logout();
    res.sendStatus(200);
  }

  @Post('refresh-token')
  @Method({ response: { status: 201, type: AuthDto } })
  refreshToken(@Body() dto: TokenDto): Promise<IAuth> {
    return this.service.refreshToken(dto);
  }
}
