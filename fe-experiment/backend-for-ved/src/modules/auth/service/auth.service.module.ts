import { Module } from '@nestjs/common';
import { AUTH_SERVICE, AuthService } from 'modules/auth/service/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { ConfigService } from '@nestjs/config';
import { CryptoAuthServiceModule } from 'lib/services/crypto360/auth/auth.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('tokens.secret'),
      }),
    }),
    NatsModule(AUTH_SERVICE),
    CryptoAuthServiceModule,
  ],
  providers: [{ provide: 'IAuthService', useClass: AuthService }],
  exports: [{ provide: 'IAuthService', useClass: AuthService }],
})
export class AuthServiceModule {}
