import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Code, CodeSchema } from './code.schema';
import { CodeService } from './code.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Code.name, schema: CodeSchema }])],
  providers: [{ provide: 'ICodeService', useClass: CodeService }],
  exports: [{ provide: 'ICodeService', useClass: CodeService }],
})
export class CodeServiceModule {}
