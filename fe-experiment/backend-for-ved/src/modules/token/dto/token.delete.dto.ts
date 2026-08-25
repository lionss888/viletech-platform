import { OmitType } from '@nestjs/swagger';
import { TokenCreateDto } from './token.create.dto';
import { ITokenDelete } from '../service/token.service.interface';

export class TokenDeleteDto extends OmitType(TokenCreateDto, ['ip'] as const) implements ITokenDelete {}
