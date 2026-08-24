import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ILiquidityService } from '../../service/liquidity.service.interface';
import { UserMethod } from '../../../../lib/decorators/user-method.decorator';
import { AccountRole } from '../../../../lib/enums/models/account.enums';
import { ILiquidityGlass } from '../../../../lib/interfaces/models/liquidity.interface';
import * as _ from 'lodash';

@ApiTags('liquidity')
@Controller('liquidity')
export class LiquiditySiteController {
  constructor(@Inject('ILiquidityService') private readonly service: ILiquidityService) {}

  @Get()
  @UserMethod({ response: { status: 200 } })
  async findByName(@Req() req: Request): Promise<ILiquidityGlass | Omit<ILiquidityGlass, 'commitments'>> {
    const result = await this.service.getLiquidityGlass();

    // USER видит только import и export, MANAGER, PROVIDER, ROOT и TREASURER видят все три стакана
    const userRoles = req.account?.roles || [];
    const hasPrivilegedRole = _.some(userRoles, (role) =>
      [
        AccountRole.MANAGER,
        AccountRole.PROVIDER,
        AccountRole.SENIOR_PROVIDER,
        AccountRole.ROOT,
        AccountRole.TREASURER,
      ].includes(role),
    );

    if (!hasPrivilegedRole) {
      // Убираем commitments для обычных пользователей
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { commitments, ...rest } = result;
      return rest;
    }

    return result;
  }
}
