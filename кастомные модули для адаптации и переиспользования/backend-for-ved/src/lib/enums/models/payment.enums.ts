export enum PaymentTransactionType {
  REPLENISHMENT = 'replenishment',
  WITHDRAW = 'withdraw',
  EXCHANGE = 'exchange',
}

export enum PaymentChargeType {
  COVER = 'cover',
  FEE = 'fee',
}

export enum PaymentEntityType {
  FORM_PAYMENT = 'FormPayment',
}

export enum PaymentPattern {
  CREATE_FOR_FORM = 'fea360.payment.create.for.form',
  CREATE_FOR_FORM_PAYMENT = 'fea360.payment.create.for.form.payment',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error',
  REFUND = 'refund',
}

export enum PaymentFrom {
  ONE_C = 'one_c',
}
