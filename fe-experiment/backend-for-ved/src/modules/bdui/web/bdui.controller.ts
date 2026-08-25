import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Method } from 'lib/decorators/method.decorator';
import { UserMethod } from 'lib/decorators/user-method.decorator';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { BDUI_VED_ROLES } from '../bdui.constants';
import { BduiSchemaService } from '../service/bdui-schema.service';
import { BduiScreen } from '../bdui.types';

@ApiTags('bdui')
@Controller('bdui/schema')
export class BduiController {
  constructor(private readonly bduiSchemaService: BduiSchemaService) {}

  /**
   * Public login schema for any ВИ role (no JWT).
   */
  @Get(':role/login')
  @Method({ summary: 'BDUI login screen schema by role', response: { status: 200 } })
  getLoginSchema(@Param('role') role: string): BduiScreen {
    this.assertVedRole(role);
    return this.bduiSchemaService.getScreen(role, 'login');
  }

  /**
   * Authenticated screen schemas. Pass status for forms.detail action_bar.
   */
  @Get(':role/:page')
  @UserMethod({ summary: 'BDUI screen schema by role and page', response: { status: 200 } })
  @ApiQuery({ name: 'status', required: false, enum: FormPaymentStatus })
  getRoleSchema(
    @Param('role') role: string,
    @Param('page') page: string,
    @Query('status') status?: FormPaymentStatus,
  ): BduiScreen {
    this.assertVedRole(role);
    if (page === 'login') {
      return this.bduiSchemaService.getScreen(role, 'login');
    }
    return this.bduiSchemaService.getScreen(role, page, status);
  }

  private assertVedRole(role: string): void {
    if (!(BDUI_VED_ROLES as readonly string[]).includes(role)) {
      throw new NotFoundException(`BDUI role not found: ${role}`);
    }
  }
}
