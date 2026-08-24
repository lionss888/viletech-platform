import { Module } from '@nestjs/common';
import { OcrService } from './ocr.service';
import { HttpModule } from '@nestjs/axios';
import { OCR_SERVICE } from './ocr.service.interface';

@Module({
  imports: [HttpModule],
  providers: [{ provide: OCR_SERVICE, useClass: OcrService }],
  exports: [{ provide: OCR_SERVICE, useClass: OcrService }],
})
export class OcrServiceModule {}
