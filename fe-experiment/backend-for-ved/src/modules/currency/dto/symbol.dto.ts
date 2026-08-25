import { PickType } from '@nestjs/swagger';
import { CurrencyDto } from 'lib/dto/models/currency.dto';

export class SymbolWithSourceDto extends PickType(CurrencyDto, ['symbol', 'source'] as const) {}
