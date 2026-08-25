import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { AccountRateRewardTierBlockDto } from '../dto/update-rate-settings.dto';

/**
 * Validates that no duplicate thresholds exist in the tiers array.
 * Each tier must have a unique thresholdMinor value.
 */
@ValidatorConstraint({ name: 'NoDuplicateThresholds', async: false })
export class NoDuplicateThresholdsValidator implements ValidatorConstraintInterface {
  validate(tiers: AccountRateRewardTierBlockDto[], args: ValidationArguments): boolean {
    if (!tiers || tiers.length <= 1) {
      return true;
    }

    const thresholds = tiers.map((t) => t.thresholdMinor);
    const uniqueThresholds = new Set(thresholds);

    return uniqueThresholds.size === thresholds.length;
  }

  defaultMessage(args: ValidationArguments): string {
    return 'Duplicate thresholds are not allowed';
  }
}
