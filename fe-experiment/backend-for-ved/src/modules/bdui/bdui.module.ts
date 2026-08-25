import { Module } from '@nestjs/common';
import { BduiLifecycleActionResolver } from './service/bdui-lifecycle-action.resolver';
import { BduiSchemaService } from './service/bdui-schema.service';
import { BduiUserActionResolver } from './service/bdui-user-action.resolver';
import { RoleCabinetBuilders } from './service/role-cabinet.builders';
import { UserScreenBuilders } from './service/user-screen.builders';
import { BduiController } from './web/bdui.controller';

@Module({
  controllers: [BduiController],
  providers: [
    BduiSchemaService,
    UserScreenBuilders,
    RoleCabinetBuilders,
    BduiLifecycleActionResolver,
    BduiUserActionResolver,
  ],
  exports: [BduiSchemaService, BduiLifecycleActionResolver, BduiUserActionResolver],
})
export class BduiModule {}
