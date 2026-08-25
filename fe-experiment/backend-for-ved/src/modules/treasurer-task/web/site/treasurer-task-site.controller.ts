import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    Body,
    Controller,
    Delete,
    Inject,
    Param,
    Patch,
    Req,
} from '@nestjs/common';
import { Request } from 'express';
import { TREASURER_TASK_SERVICE } from '../../treasurer-task.constants';
import { ITreasurerTaskService } from '../../service/treasurer-task.service.interface';
import { UserMethod } from '../../../../lib/decorators/user-method.decorator';
import { ITreasurerTask } from '../../../../lib/interfaces/models/treasurer-task.interface';
import { TreasurerTaskUpdateOrderSignedFileDto } from '../../dto/treasurer-task.update-order-signed-file.dto';

@ApiCookieAuth()
@ApiTags('treasurer task')
@Controller('treasurer-task')
export class TreasurerTaskSiteController {
    constructor(
        @Inject(TREASURER_TASK_SERVICE) private readonly service: ITreasurerTaskService,
    ) {}

    @Patch(':formPaymentId/order-signed')
    @UserMethod({
        summary: 'Привязать существующий файл к подписанному платежному поручению казначея',
        response: { status: 200 },
    })
    @ApiOperation({
        summary: 'Привязать существующий файл к подписанному платежному поручению казначея',
        description:
            'Привязывает существующий файл (по ID) к подписанному поручению казначея и сохраняет ID в поле treasurerOrderSigned. Параметр :formPaymentId - это ID импортной сделки (form payment ID).',
    })
    async updateOrderSigned(
        @Param('formPaymentId') formPaymentId: string,
        @Body() dto: TreasurerTaskUpdateOrderSignedFileDto,
        @Req() req: Request,
    ): Promise<ITreasurerTask> {
        return this.service.updateOrderSignedByUser(
            formPaymentId,
            dto.fileId,
            req.account._id.toString(),
        );
    }

    @Delete(':formPaymentId/order-signed')
    @UserMethod({
        summary: 'Удалить подписанное поручение казначея',
        response: { status: 200 },
    })
    @ApiOperation({
        summary: 'Удалить подписанное поручение казначея',
        description: 'Удаляет подписанное поручение казначея из S3, базы данных и очищает поле treasurerOrderSigned. Параметр :formPaymentId - это ID импортной сделки (form payment ID).',
    })
    async deleteOrderSigned(
        @Param('formPaymentId') formPaymentId: string,
        @Req() req: Request,
    ): Promise<ITreasurerTask> {
        return this.service.deleteOrderSignedByUser(formPaymentId, req.account._id.toString());
    }
}

