export enum SenderPattern {
  SEND_USER = 'fea.sender.mail.send.user',
  SEND_ADMINS = 'fea.sender.mail.send.admins',
}

export enum SenderTelegramPattern {
  SEND = 'fea.sender.telegram.send',
}

export enum SenderTelegramChannels {
  MANAGER = 'manager',
  PROVIDER = 'provider',
  COMPLIANCE_OFFICER = 'complianceOfficer',
  LAWYER = 'lawyer',
  PAYMENTS = 'payments',
}

export enum SenderFormPaymentEvents {
  COMPLETED = 'completed',
  CANCELED_BY_ADMIN = 'canceledByAdmin',
  CANCELED_BY_COMPLIANCE_OFFICER = 'canceledByComplianceOfficer',
  CANCELED_BY_USER = 'canceledByUser',
  FORM_ACCEPTED = 'formAccepted',
  ACCEPT_CONTRACT = 'acceptContract',
  USER_ACCEPTED_FORM = 'userAcceptedForm',
  MANAGER_REJECT_FORM = 'managerRejectForm',
  SIGNING_ORDER = 'signingOrder',
  REJECT_ORDER = 'rejectOrder',
  ORDER_SIGN_UPLOADED = 'orderSignUploaded',
  ORDER_ACCEPT = 'orderAccept',
  PAYMENT_RECEIVED_IMPORT = 'paymentReceivedImport',
  PAYMENT_RECEIVED_EXPORT = 'paymentReceivedExport',
  PAYMENT_RECEIVED = 'paymentReceived',
  PAYMENT_SENT = 'paymentSent',
  REPORT_WAITING = 'reportWaiting',
  REPORT_WAITING_DIADOC = 'reportWaitingDiadoc', // VF-2: отчёт отправлен на подписание в ЭДО
  REPORT_SIGN_UPLOADED = 'reportSignUploaded',
  SHIPMENT_WAITING = 'shipmentWaiting',
  SHIPMENT_WAITING_CORRECTIONS = 'shipmentWaitingCorrections',
  SHIPMENT_UPLOADED = 'shipmentUploaded',
  MANAGER_CHECKING = 'managerChecking',
  FORM_PAYMENT_EXTERNAL_COMMENT_CREATED = 'formPaymentExternalCommentCreated',
  FORM_PAYMENT_INTERNAL_COMMENT_CREATED = 'formPaymentInternalCommentCreated',
  FORM_PAYMENT_INTERNAL_COMMENT_CREATED_PROVIDER = 'formPaymentInternalCommentCreatedProvider',
  FORM_PAYMENT_INTERNAL_COMMENT_CREATED_MANAGER = 'formPaymentInternalCommentCreatedManager',
  REFUND_WAITING = 'refundWaiting',
  REFUND_SENT = 'refundSent',
  EXPIRES_PAID_DATE = 'expiresPaidDate',
  ORGANIZATION_WAITING_VERIFICATION = 'organizationWaitingVerification',
  PAYMENT_REJECTED = 'paymentRejected',
  // VF-2: События для интеграции с Diadoc
  DIADOC_SIGNING_EXPIRED = 'diadocSigningExpired',
  DIADOC_DOCUMENT_SIGNED = 'diadocDocumentSigned',
  DIADOC_DOCUMENT_REJECTED = 'diadocDocumentRejected',
  DIADOC_API_ERROR = 'diadocApiError',
}

export enum SenderOrganizationEvents {
  ORGANIZATION_SUBACCOUNT_INVITE = 'organizationSubaccountInvite',
  REJECT_ORGANIZATION_SUBACCOUNT_INVITE = 'rejectOrganizationSubaccountInvite',
  ACCEPT_ORGANIZATION_SUBACCOUNT_INVITE = 'acceptOrganizationSubaccountInvite',
  DELETE_ORGANIZATION_SUBACCOUNT = 'deleteOrganizationSubaccount',
}

export enum AuthEvents {
  REGISTRATION = 'registration',
  RESTORE = 'restore',
}
