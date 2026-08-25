import { INegotiateConnectionResult } from '../service/socket.service.interface';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class NegotiateConnectionResultDto implements INegotiateConnectionResult {
  @ApiProperty()
  @IsString()
  connectionToken: string;
}
