import { Module } from '@nestjs/common';
import { RecognitionServiceModule } from '../service/recognition.service.module';

@Module({
  imports: [RecognitionServiceModule],
})
export class RecognitionRpcModule {}
