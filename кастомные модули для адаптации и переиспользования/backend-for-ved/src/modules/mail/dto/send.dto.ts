import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { IAccount } from 'lib/interfaces/models/account.interface';
import { Lang } from 'lib/enums/common.enums';
import { IMailSend } from '../service/mail.service.interface';
import { OmitType } from '@nestjs/swagger';
export class SendUserDto implements IMailSend {
  @IsOptional()
  account: IAccount;

  @IsString()
  type: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(Lang)
  language: Lang;

  @IsNotEmpty()
  @IsOptional()
  data: any;
}

export class SendAdminsDto extends OmitType(SendUserDto, ['account']) implements Omit<IMailSend, 'account'> {}
