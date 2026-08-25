import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { AccountRateRewardTierBlockDto } from '../dto/update-rate-settings.dto';

/**
 * Validates that tiers are sorted by thresholdMinor in ascending order.
 * Ensures tier thresholds progress strictly increasing.
 */
@ValidatorConstraint({ name: 'TiersSorted', async: false })
export class TiersSortedValidator implements ValidatorConstraintInterface {
  validate(tiers: AccountRateRewardTierBlockDto[], args: ValidationArguments): boolean {
    if (!tiers || tiers.length <= 1) {
      return true; // No sorting needed for 0 or 1 tier
    }

    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].thresholdMinor <= tiers[i - 1].thresholdMinor) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Tiers must be sorted by thresholdMinor in ascending order';
  }
}
