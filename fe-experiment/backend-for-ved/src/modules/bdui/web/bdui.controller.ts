import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Method } from 'lib/decorators/method.decorator';
import { UserMethod } from 'lib/decorators/user-method.decorator';
import { FormPaymentStatus } from 'lib/enums/models/form-payment.enums';
import { BduiSchemaService } from '../service/bdui-schema.service';
import { BduiScreen } from '../bdui.types';

@ApiTags('bdui')
@Controller('bdui/schema/user')
export class BduiController {
  constructor(private readonly bduiSchemaService: BduiSchemaService) {}

  /**
   * Public login schema for the BDUI experiment (no JWT).
   */
  @Get('login')
  @Method({ summary: 'BDUI User login screen schema', response: { status: 200 } })
  getLoginSchema(): BduiScreen {
    return this.bduiSchemaService.getUserScreen('login');
  }

  /**
   * Authenticated User screen schemas. Pass status for forms.detail action_bar.
   * Page ids use dots (forms.list) — matched as a single path segment.
   */
  @Get(':page')
  @UserMethod({ summary: 'BDUI User screen schema', response: { status: 200 } })
  @ApiQuery({ name: 'status', required: false, enum: FormPaymentStatus })
  getUserSchema(
    @Param('page') page: string,
    @Query('status') status?: FormPaymentStatus,
  ): BduiScreen {
    return this.bduiSchemaService.getUserScreen(page, status);
  }
}
