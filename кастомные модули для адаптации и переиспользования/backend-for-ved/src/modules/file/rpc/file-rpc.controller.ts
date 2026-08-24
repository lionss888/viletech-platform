import { Controller, Inject } from '@nestjs/common';
import { CatcherMessagePattern } from 'lib/decorators/catcher-message-pattern.decorator';
import { queryPaginateParser } from 'lib/utils/helpers/entity.helper';
import { IFileService, IFileString } from '../service/file.service.interface';
import { IPaginateResult } from 'lib/interfaces/paginate.interface';
import { IFile } from 'lib/interfaces/models/file.interface';
import { FilePaginateDtoDto, FileQueryDto } from '../dto/file.query.dto';
import { FilePattern } from 'lib/enums/models/file.enums';
import { TextFieldDto } from '../../../lib/dto/text-field.dto';
import { CreateZipDto } from '../dto/compress.dto';
import { CreateDocumentDocxDto } from '../dto/create-document.dto';
import { FILE_SERVICE } from '../file.constants';
import { RequestFileStreamDto } from '../../../lib/dto/models/file.dto';

@Controller()
export class FileRpcController {
  constructor(@Inject(FILE_SERVICE) private readonly service: IFileService) {}

  @CatcherMessagePattern(FilePattern.FIND_WITH_PAGINATE)
  findWithPaginate(dto: FilePaginateDtoDto): Promise<IPaginateResult<IFile>> {
    const { model, paginate } = queryPaginateParser(dto, FileQueryDto);
    return this.service.find(model, paginate);
  }

  @CatcherMessagePattern(FilePattern.FIND_MANY)
  findMany(dto: FileQueryDto): Promise<IFile[]> {
    return this.service.findMany(dto);
  }

  @CatcherMessagePattern(FilePattern.FIND_ONE)
  findOne(query: FileQueryDto): Promise<IFile> {
    return this.service.findOne(query);
  }

  @CatcherMessagePattern(FilePattern.FIND_ONE_FILE_STRING)
  getFileString(query: FileQueryDto): Promise<IFileString> {
    return this.service.getFileString(query);
  }

  @CatcherMessagePattern(FilePattern.CREATE_PDF)
  createPdf(dto: TextFieldDto): Promise<IFile> {
    return this.service.createPdf(dto);
  }

  @CatcherMessagePattern(FilePattern.CREATE_DOCX)
  createDocx(dto: CreateDocumentDocxDto): Promise<IFile> {
    return this.service.createDocx(dto);
  }

  @CatcherMessagePattern(FilePattern.COMPRESS)
  compress(dto: CreateZipDto): Promise<IFile> {
    return this.service.compress(dto);
  }

  @CatcherMessagePattern(FilePattern.REQUEST_FILE_STREAM)
  requestFileStream(dto: RequestFileStreamDto): Promise<void> {
    return this.service.streamRpcFile(dto.destination, { _id: dto.fileId });
  }
}
