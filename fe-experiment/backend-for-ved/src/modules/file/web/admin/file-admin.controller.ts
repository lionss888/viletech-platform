import {
  Controller,
  FileTypeValidator,
  Get,
  Inject,
  Param,
  ParseFilePipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { IFileService } from '../../service/file.service.interface';
import { Request, Response } from 'express';
import { PreviewDto } from '../../dto/preview.dto';
import { ApiNotFoundMessagesResponse } from 'lib/decorators/api-not-found-messages-response.decorator';
import { ManagerMethod } from '../../../../lib/decorators/manager-method.decorator';
import { FileDto } from '../../../../lib/dto/models/file.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { IFile } from '../../../../lib/interfaces/models/file.interface';
import { plainToClass } from 'class-transformer';
import { MimeTypes } from '../../../../lib/enums/common.enums';
import { FILE_SERVICE, uploadFileSizeLimit } from '../../file.constants';

@ApiCookieAuth()
@ApiTags('file-store admin')
@Controller('admin/file-store')
export class FileAdminController {
  constructor(@Inject(FILE_SERVICE) private readonly service: IFileService) {}

  @Get('preview/:_id')
  @ApiNotFoundMessagesResponse(['File not found.'])
  @ManagerMethod({ response: { description: 'Return stream file', status: 200 } })
  async preview(@Param() params: PreviewDto, @Req() req: Request, @Res() res: Response) {
    const { stream, file } = await this.service.preview({ _id: params._id });
    res.set({ 'Content-Type': file.mimeType });
    stream.pipe(res);
  }

  @Post('upload')
  @ManagerMethod({ response: { type: FileDto } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: uploadFileSizeLimit, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request): Promise<IFile> {
    const uploadFile = await this.service.upload(file, { account: req.account._id, private: true });
    return plainToClass(FileDto, uploadFile);
  }

  @Post('upload/pdf')
  @ManagerMethod({ response: { type: FileDto } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: uploadFileSizeLimit, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  async uploadPdf(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: MimeTypes.PDF })],
      }),
    )
    file: Express.Multer.File,
    @Req() req: Request,
  ): Promise<IFile> {
    const uploadFile = await this.service.upload(file, { account: req.account._id, private: true });
    return plainToClass(FileDto, uploadFile);
  }
}
