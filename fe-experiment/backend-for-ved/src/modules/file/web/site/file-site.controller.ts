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
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IFileService } from '../../service/file.service.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { IFile } from 'lib/interfaces/models/file.interface';
import { PreviewDto, PreviewFormDto, PreviewOrganizationDto } from '../../dto/preview.dto';
import { plainToClass } from 'class-transformer';
import { FileDto } from 'lib/dto/models/file.dto';
import { ApiNotFoundMessagesResponse } from 'lib/decorators/api-not-found-messages-response.decorator';
import { UserMethod } from 'lib/decorators/user-method.decorator';
import { FILE_SERVICE, uploadFileSizeLimit } from '../../file.constants';
import { MimeTypes } from '../../../../lib/enums/common.enums';

@ApiTags('file-store')
@Controller('file-store')
export class FileSiteController {
  constructor(@Inject(FILE_SERVICE) private readonly service: IFileService) {}

  @Post('upload')
  @UserMethod({ response: { type: FileDto } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: uploadFileSizeLimit, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request): Promise<IFile> {
    const uploadFile = await this.service.upload(file, { account: req.account._id, private: true });
    return plainToClass(FileDto, uploadFile);
  }

  @Post('upload/pdf')
  @UserMethod({ response: { type: FileDto } })
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

  @Get('preview/private/:_id')
  @ApiNotFoundMessagesResponse(['File not found.'])
  @UserMethod({ response: { description: 'Return stream file', status: 200 } })
  async previewProtected(@Param() params: PreviewDto, @Req() req: Request, @Res() res: Response) {
    const { stream, file } = await this.service.preview({ _id: params._id, account: req.account._id });
    res.set({ 'Content-Type': file.mimeType });
    stream.pipe(res);
  }

  @Get('preview/private/contract/:contract')
  @ApiNotFoundMessagesResponse(['File not found.'])
  @UserMethod({ response: { description: 'Return stream file', status: 200 } })
  async previewInContract(@Param() params: PreviewOrganizationDto, @Req() req: Request, @Res() res: Response) {
    const { stream, file } = await this.service.previewInContract({
      contract: params.contract,
      account: req.account._id,
    });
    res.set({ 'Content-Type': file.mimeType });
    stream.pipe(res);
  }

  @Get('preview/private/:form/:filePath')
  @ApiNotFoundMessagesResponse(['File not found.'])
  @UserMethod({ response: { description: 'Return stream file', status: 200 } })
  async previewFormProtected(@Param() params: PreviewFormDto, @Req() req: Request, @Res() res: Response) {
    const { stream, file } = await this.service.previewInForm({
      form: params.form,
      filePath: params.filePath,
      account: req.account._id,
    });
    res.set({ 'Content-Type': file.mimeType });
    stream.pipe(res);
  }

  // @Get('preview/private/:_id/string')
  // @ApiNotFoundMessagesResponse(['File not found.'])
  // @UserMethod({ response: { description: 'Return stream file', status: 200 } })
  // async previewStringProtected(@Param() params: PreviewDto, @Req() req: Request) {
  //   return this.service.getFileString({ _id: params._id, account: req.account._id });
  // }

  // @Get('preview/:_id')
  // @ApiNotFoundMessagesResponse(['File not found.'])
  // @Method({ response: { description: 'Return stream file', status: 200 } })
  // async preview(@Param() params: PreviewDto, @Res() res: Response) {
  //   const { stream, file } = await this.service.preview({ _id: params._id, private: false });
  //   res.set({ 'Content-Type': file.mimeType });
  //   stream.pipe(res);
  // }

  // @Get('static/:type/:name')
  // @ApiNotFoundMessagesResponse(['File not found.'])
  // @ApiBadRequestMessagesResponse(['Unable to determine mimetype.'])
  // @Method({ response: { description: 'Return stream file', status: 200 } })
  // async statistic(@Param() params: StaticsDto, @Res() res: Response) {
  //   const { stream, mimetype } = await this.service.statics(params);
  //   res.set({ 'Content-Type': mimetype });
  //   stream.pipe(res);
  // }
}
