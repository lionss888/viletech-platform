import { IDisconnectOne } from '../service/socket.service.interface';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DisconnectOneDto implements IDisconnectOne {
  @ApiProperty()
  @IsString()
  account: string;
}
