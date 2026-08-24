import {
  Controller,
  Post,
  Delete,
  Inject,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { IHsCodeService } from '../../service/hs-code.service.interface';
import { Method } from 'lib/decorators/method.decorator';

@ApiTags('hs-code')
@Controller('admin/root/hs-code')
export class HsCodeRootController {
  private readonly logger = new Logger(HsCodeRootController.name);

  constructor(@Inject('IHsCodeService') private readonly service: IHsCodeService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @Method({ response: { status: 200 } })
  async importFromExcel(@UploadedFile() file: Express.Multer.File): Promise<{ imported: number; updated: number }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const result = await this.service.importFromExcel(file.buffer);

    this.logger.log(`Excel import completed: imported=${result.imported}, updated=${result.updated}`);

    return result;
  }

  @Delete(':id')
  @Method({ response: { status: 200 } })
  async delete(@Param('id') id: string): Promise<void> {
    await this.service.deleteHsCode(id);
  }
}
