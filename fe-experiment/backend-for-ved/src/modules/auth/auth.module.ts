import { Module } from '@nestjs/common';
import { AuthSiteModule } from './web/site/auth-site.module';
import { AuthRPCModule } from './rpc/auth-rpc.module';
import { AuthOneCModule } from './web/one-c/auth-one-c.module';

@Module({
  imports: [AuthSiteModule, AuthOneCModule, AuthRPCModule],
})
export class AuthModule {}
