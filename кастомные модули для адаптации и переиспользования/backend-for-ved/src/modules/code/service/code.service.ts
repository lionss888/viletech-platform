import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PaginateModel } from 'mongoose';
import { Code } from './code.schema';
import { ICodeCreate, ICodeCreateManyFull, ICodeOptions, ICodeQuery, ICodeService } from './code.service.interface';
import { ICode } from 'lib/interfaces/models/code.interface';
import { IAccountField } from 'lib/interfaces/account-filed.interface';
import { ConfigService } from '@nestjs/config';
import { BaseService } from 'lib/services/base/base.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CodeService
  extends BaseService<ICode, Code, ICodeQuery, ICodeOptions, ICodeCreate>
  implements ICodeService
{
  private readonly logger = new Logger(CodeService.name);

  constructor(
    @InjectModel(Code.name) readonly model: PaginateModel<Code>,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleDeleteExpiredCodes() {
    try {
      await this.deleteExpiredCodes();
    } catch (e) {
      this.logger.error(e);
    }
  }

  async createManyFull({ data }: ICodeCreateManyFull): Promise<void> {
    await this.model.insertMany(data as any[]);
  }

  async verify({ type, account, code }: ICode): Promise<boolean> {
    const savedCode = await this.model.findOne({ account, type }).exec();

    if (!savedCode || !savedCode.verify(code, this.configService.get<string>('code.staticSalt'))) {
      return false;
    }

    if (savedCode.expirationDate && savedCode.expirationDate < new Date()) {
      return false;
    }

    await savedCode.deleteOne();

    return true;
  }

  async generate({ account, type, expirationDate }: ICodeCreate): Promise<string> {
    let model = await this.model.findOne({ type, account }).exec();

    if (!model) {
      model = new this.model({ type, account, expirationDate });
    }

    const generatedCode = this.generateCode();
    model.setGeneratedCode(generatedCode, this.configService.get<string>('code.staticSalt'));

    await model.save();

    return generatedCode;
  }

  async removeMany(data: IAccountField): Promise<void> {
    await this.model.deleteMany(data).exec();
  }

  private generateCode(): string {
    const codeConfig = this.configService.get('code');
    return codeConfig.useStaticCode ? codeConfig.staticCode : Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async deleteExpiredCodes(): Promise<void> {
    await this.model.deleteMany({
      expirationDate: {
        $exists: true,
        $lt: new Date(),
      },
    });
  }
}
