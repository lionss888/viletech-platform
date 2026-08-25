import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { AccountRateRewardTierBlockDto } from '../dto/update-rate-settings.dto';

/**
 * Validates that the last tier has 'above' reward defined.
 * The 'above' field represents commission for amounts exceeding the final threshold,
 * so the last tier must define it.
 */
@ValidatorConstraint({ name: 'LastTierHasAbove', async: false })
export class LastTierHasAboveValidator implements ValidatorConstraintInterface {
  validate(tiers: AccountRateRewardTierBlockDto[], args: ValidationArguments): boolean {
    if (!tiers || tiers.length === 0) {
      return true; // No validation needed for empty tiers
    }

    const lastTier = tiers[tiers.length - 1];
    return !!lastTier.above;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Last tier must have "above" reward defined for amounts exceeding all thresholds';
  }
}
