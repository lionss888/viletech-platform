import { Controller, Inject } from '@nestjs/common';
import { IFileService } from '../service/file.service.interface';
import { FILE_SERVICE } from '../file.constants';

@Controller()
export class FileEventController {
  constructor(@Inject(FILE_SERVICE) private readonly service: IFileService) {}
}
