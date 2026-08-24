import { ISocketMessage, ISocketMessageData } from '../../interfaces/models/socket.interface';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsNotEmpty, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { SocketMessageAction, SocketMessageContext } from '../../enums/models/socket.enum';

export class SocketMessageDataDto<Payload = unknown> implements ISocketMessageData<Payload> {
  @ApiProperty({ enum: SocketMessageContext })
  @IsEnum(SocketMessageContext)
  @IsNotEmpty()
  context: SocketMessageContext;

  @ApiProperty({ enum: SocketMessageAction })
  @IsEnum(SocketMessageAction)
  @IsNotEmpty()
  action: SocketMessageAction;

  @ApiProperty()
  @IsDefined()
  @ValidateIf((object) => !!object.payload)
  payload?: Payload;
}

export class SocketMessageDto<Payload = unknown> implements ISocketMessage<Payload> {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty({ type: SocketMessageDataDto })
  @ValidateNested()
  data: SocketMessageDataDto<Payload>;
}
