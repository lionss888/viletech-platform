import { Module } from '@nestjs/common';
import { RecognitionEventModule } from './event/recognition-event.module';

@Module({
  imports: [RecognitionEventModule],
})
export class RecognitionModule {}
