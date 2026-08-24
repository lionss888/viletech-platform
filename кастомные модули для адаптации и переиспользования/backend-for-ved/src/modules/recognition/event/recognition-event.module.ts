import { Module } from '@nestjs/common';
import { RecognitionServiceModule } from '../service/recognition.service.module';
import { RecognitionEventController } from './recognition-event.controller';

@Module({
  imports: [RecognitionServiceModule],
  controllers: [RecognitionEventController],
})
export class RecognitionEventModule {}
