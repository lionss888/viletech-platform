export enum SocketPattern {
  CHECK_ACCOUNT_CONNECTION = 'socket.check.account.connection',
  CHECK_ACCOUNTS_CONNECTION = 'socket.check.accounts.connection',
  DISCONNECT_ONE = 'socket.disconnect.one',
}

export enum SocketQueue {
  SEND_ONE = 'socket.send.one',
  BROADCAST_ONE = 'socket.broadcast.one',
  BROADCAST_ONE_AUTHORIZED = 'socket.broadcast.one.authorized',
}

export enum SocketEventPattern {
  SEND_ONE = 'socket.send.one',
  SEND_MANY = 'socket.send.many',
  BROADCAST_ONE = 'socket.broadcast.one',
  BROADCAST_MANY = 'socket.broadcast.many',
  BROADCAST_MANY_AUTHORIZED = 'socket.broadcast.many.authorized',
  BROADCAST_ONE_AUTHORIZED = 'socket.broadcast.one.authorized',
}

export enum SocketMessageChannel {
  NOTIFY = 'notify',
}

export enum SocketMessageContext {
  CURRENCY = 'currency',
  LIQUIDITY = 'liquidity',
  LIQUIDITY_SHORT = 'liquidityShort',
  FORM_PAYMENT = 'formPayment',
  ACCOUNT = 'account',
  COMMENT = 'comment',
  VIRTUAL_ACCOUNT = 'virtualAccount',
}

export enum SocketMessageAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  UPDATE_DASHBOARD_RATES = 'updateDashboardRates',
}

export enum FormPaymentSocketEventType {
  EXCEL_PARSED = 'form-payment-excel-parsed',
  EXCEL_PARSE_FAILED = 'form-payment-excel-parse-failed',
  EXCEL_PARSE_CANCELLED = 'form-payment-excel-parse-cancelled',
  COMPLIANCE_REPORT_COMPLETED = 'form-payment-compliance-report-completed',
}
