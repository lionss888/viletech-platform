import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RateSettingsResponseDto, UserResponseDto } from './rate-settings-response.dto';

/**
 * Single history entry response
 * Represents a snapshot of settings at a particular change point
 */
export class RateHistoryEntryDto {
  @ApiProperty({
    type: Date,
    description: 'When this change was made',
    example: '2024-01-15T10:30:00Z',
  })
  changedAt: Date;

  @ApiProperty({
    type: UserResponseDto,
    description: 'User who made the change',
  })
  changedBy: UserResponseDto;

  @ApiPropertyOptional({
    type: [RateSettingsResponseDto],
    description: 'Settings snapshot after this change (null if reverted to default). Multiple rules are possible.',
    nullable: true,
  })
  settings: RateSettingsResponseDto[] | null;
}

/**
 * Pagination metadata for history list
 */
export class PaginationDto {
  @ApiProperty({
    description: 'Total number of history entries',
    example: 45,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number (1-indexed)',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  pages: number;
}

/**
 * Paginated rate history response (GET /rate-settings/history)
 */
export class PaginatedRateHistoryDto {
  @ApiProperty({
    type: [RateHistoryEntryDto],
    description: 'History entries for this page',
  })
  entries: RateHistoryEntryDto[];

  @ApiProperty({
    type: PaginationDto,
    description: 'Pagination information',
  })
  pagination: PaginationDto;
}
