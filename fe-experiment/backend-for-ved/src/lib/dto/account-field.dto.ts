import { IAccountField } from 'lib/interfaces/account-filed.interface';
import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AccountFieldDto implements IAccountField {
  @ApiProperty()
  @IsNotEmpty()
  @Type(() => String)
  @IsMongoId()
  account: string;
}
