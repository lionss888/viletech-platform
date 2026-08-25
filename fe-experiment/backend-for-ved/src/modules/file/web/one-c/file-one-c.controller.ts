import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IFileService } from '../../service/file.service.interface';
import { Response } from 'express';
import { PreviewDto } from '../../dto/preview.dto';
import { ApiNotFoundMessagesResponse } from 'lib/decorators/api-not-found-messages-response.decorator';
import { OneCMethod } from 'lib/decorators/one-c-method.decorator';

@ApiTags('1C file-store')
@Controller('1c/file-store')
export class FileOneCController {
  constructor(@Inject('IFileService') private readonly service: IFileService) {}

  @Get('preview/:_id')
  @ApiNotFoundMessagesResponse(['File not found.'])
  @OneCMethod({
    summary: 'Загрузка превью файла',
    response: { description: 'Return stream file', status: 200 },
  })
  async preview(@Param() params: PreviewDto, @Res() res: Response) {
    const { stream, file } = await this.service.preview({ _id: params._id });
    res.set({ 'Content-Type': file.mimeType });
    stream.pipe(res);
  }
}
