import { OmitType } from '@nestjs/swagger';
import { ITokenCreate } from '../service/token.service.interface';
import { TokenBaseDto } from 'lib/dto/models/token.dto';

export class TokenCreateDto extends OmitType(TokenBaseDto, ['hash', 'expires']) implements ITokenCreate {}
