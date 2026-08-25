import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Token, TokenSchema } from './token.schema';
import { NatsModule } from 'lib/modules/nats/nats.module';
import { TOKEN_CLIENT } from '../token.constants';

@Module({
  imports: [MongooseModule.forFeature([{ name: Token.name, schema: TokenSchema }]), NatsModule(TOKEN_CLIENT)],
  providers: [{ provide: 'ITokenService', useClass: TokenService }],
  exports: [{ provide: 'ITokenService', useClass: TokenService }],
})
export class TokenServiceModule {}
