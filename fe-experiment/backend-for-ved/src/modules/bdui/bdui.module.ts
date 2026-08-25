import { Module } from '@nestjs/common';
import { BduiSchemaService } from './service/bdui-schema.service';
import { BduiUserActionResolver } from './service/bdui-user-action.resolver';
import { UserScreenBuilders } from './service/user-screen.builders';
import { BduiController } from './web/bdui.controller';

@Module({
  controllers: [BduiController],
  providers: [BduiSchemaService, UserScreenBuilders, BduiUserActionResolver],
  exports: [BduiSchemaService, BduiUserActionResolver],
})
export class BduiModule {}
