import { ApiProperty, IntersectionType, PickType } from '@nestjs/swagger';
import { IAccountCreate, IAccountCreateByRoot } from '../service/account.service.interface';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { AccountDto } from '../../../lib/dto/models/account.dto';
import { PasswordFieldDto } from '../../../lib/dto/password-field.dto';

export class AccountBaseCreateDto implements Omit<IAccountCreate, 'password'> {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class AccountCreateDto extends AccountBaseCreateDto implements Omit<IAccountCreate, 'password'> {}

export class AccountCreateAdminDto
  extends IntersectionType(PasswordFieldDto, PickType(AccountDto, ['email', 'fullName', 'roles', 'phone']))
  implements IAccountCreateByRoot {}
