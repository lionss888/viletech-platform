/**
 * Event emitted when deal rate is fixed for first time
 * Triggers async payment order generation
 */
export interface DealRateFixedEvent {
  /**
   * FormPayment ID
   */
  formPaymentId: string;

  /**
   * Account ID
   */
  accountId: string;

  /**
   * Fixed exchange rate value
   */
  rate: number;

  /**
   * When rate was fixed
   */
  fixedAt: Date;
}
