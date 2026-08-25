import { Module } from '@nestjs/common';
import { NatsModule } from '../../../lib/modules/nats/nats.module';
import { RECOGNITION_CLIENT, RECOGNITION_SERVICE } from '../recognition.constants';
import { AnthropicModule } from '../../../lib/services/anthropic/anthropic.module';
import { OcrServiceModule } from '../../../lib/services/ocr/ocr.module';
import { RecognitionService } from './recognition.service';
import { HttpModule } from '@nestjs/axios';
import { FileServiceModule } from '../../file/service/file.service.module';

@Module({
  imports: [NatsModule(RECOGNITION_CLIENT), AnthropicModule, OcrServiceModule, HttpModule, FileServiceModule],
  providers: [{ provide: RECOGNITION_SERVICE, useClass: RecognitionService }],
  exports: [{ provide: RECOGNITION_SERVICE, useClass: RecognitionService }],
})
export class RecognitionServiceModule {}
