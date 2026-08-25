import { IntersectionType } from '@nestjs/swagger';
import { ILoginAdmin } from '../service/auth.service.interface';
import { PasswordFieldDto } from 'lib/dto/password-field.dto';
import { EmailFieldDto } from '../../../lib/dto/email-field.dto';

export class LoginAdminDto extends IntersectionType(EmailFieldDto, PasswordFieldDto) implements ILoginAdmin {}
