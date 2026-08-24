import { FormPaymentCondition } from '../../enums/models/form-payment.enums';

type SigningOrderFeePaymentTextParams = {
  feeAmount: string | number;
  platformPaymentCondition?: FormPaymentCondition | null;
  isAdvanceOrder?: boolean;
};

export const getSigningOrderFeePaymentText = (params: SigningOrderFeePaymentTextParams): string => {
  const { feeAmount, platformPaymentCondition, isAdvanceOrder } = params;
  const formattedFeeAmount = typeof feeAmount === 'string' ? feeAmount.trim() : `${feeAmount}`;

  const advancePaymentText = `Авансовая оплата\nАванс - ${formattedFeeAmount} RUB`;

  if (isAdvanceOrder) {
    return advancePaymentText;
  }

  if (platformPaymentCondition === FormPaymentCondition.POST_PAYMENT) {
    return `Постоплата\nПостоплата - ${formattedFeeAmount} RUB`;
  }

  return advancePaymentText;
};
