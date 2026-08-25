import { Module } from '@nestjs/common';
import { ExcelParserService } from './excel-parser.service';

@Module({
  providers: [ExcelParserService, { provide: 'IExcelParserService', useClass: ExcelParserService }],
  exports: [ExcelParserService, { provide: 'IExcelParserService', useClass: ExcelParserService }],
})
export class ExcelParserModule {}
