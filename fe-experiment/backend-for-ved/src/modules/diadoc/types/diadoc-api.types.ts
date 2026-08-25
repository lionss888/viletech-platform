/**
 * Типы для Diadoc API ответов
 * @see https://developer.kontur.ru/doc/diadoc-api/
 *
 * Автор: Специалист оператор + Ассистент [бот коммерческий]
 * Интеллектуальные права принадлежат ООО «Иннотек Лабс»
 */

/**
 * Ответ метода PostMessage
 * @see https://developer.kontur.ru/doc/diadoc-api/http/PostMessage.html
 */
export interface DiadocMessageResponse {
  MessageId: string;
  Entities?: DiadocEntity[];
  Timestamp?: string;
  LastPatchTimestamp?: string;
  FromBoxId?: string;
  ToBoxId?: string;
}

/**
 * Сущность в сообщении Diadoc
 */
export interface DiadocEntity {
  EntityId: string;
  ParentEntityId?: string;
  EntityType?: DiadocEntityType;
  AttachmentType?: DiadocAttachmentType;
  FileName?: string;
  Content?: DiadocEntityContent;
  DocumentInfo?: DiadocEntityDocumentInfo;
  // Дополнительные поля для совместимости
  Status?: string;
}

/**
 * Контент сущности
 */
export interface DiadocEntityContent {
  Size?: number;
  Data?: string;
  // Для некоторых типов сущностей может быть вложенный подписанный контент
  SignedContent?: string | unknown[];
}

/**
 * Типы сущностей Diadoc
 */
export type DiadocEntityType =
  | 'Attachment'
  | 'Signature'
  | 'SignatureVerification'
  | 'Receipt'
  | 'ReceiptConfirmation'
  | 'CorrectionRequest'
  | 'Revocation'
  | 'ResolutionRequest'
  | 'Resolution'
  | 'ResolutionRequestDenial'
  | 'PowerOfAttorney'
  | 'PowerOfAttorneyInformation'
  | string;

/**
 * Типы вложений Diadoc
 */
export type DiadocAttachmentType =
  | 'Nonformalized'
  | 'Invoice'
  | 'InvoiceCorrection'
  | 'InvoiceRevision'
  | 'InvoiceCorrectionRevision'
  | 'Torg12'
  | 'AcceptanceCertificate'
  | 'ProformaInvoice'
  | 'XmlTorg12'
  | 'XmlAcceptanceCertificate'
  | 'UniversalTransferDocument'
  | 'UniversalTransferDocumentRevision'
  | 'UniversalCorrectionDocument'
  | 'UniversalCorrectionDocumentRevision'
  | 'PrintForm'
  | string;

/**
 * Информация о документе в сущности
 */
export interface DiadocEntityDocumentInfo {
  DocumentType?: string;
  DocumentFunction?: string;
  DocumentVersion?: string;
  RecipientResponseStatus?: DiadocRecipientResponseStatus;
  DocflowStatus?: DiadocDocflowStatus;
}

/**
 * Статус документооборота
 */
export interface DiadocDocflowStatus {
  PrimaryStatus?: DiadocPrimaryStatus;
  SecondaryStatus?: DiadocSecondaryStatus;
  BilateralDocumentStatus?: DiadocBilateralDocumentStatus;
}

/**
 * Основной статус документооборота
 */
export interface DiadocPrimaryStatus {
  Severity?: DiadocStatusSeverity;
  StatusText?: string;
  StatusHint?: string;
}

/**
 * Дополнительный статус документооборота
 */
export interface DiadocSecondaryStatus {
  Severity?: DiadocStatusSeverity;
  StatusText?: string;
  StatusHint?: string;
}

/**
 * Уровень критичности статуса (НЕ использовать для определения статуса подписи!)
 * @see https://developer.kontur.ru/doc/diadoc-api/proto/obsolete/DocflowStatusSeverity.html
 */
export type DiadocStatusSeverity = 'UnknownSeverity' | 'Info' | 'Success' | 'Warning' | 'Error';

/**
 * Статус ответа получателя
 * @see https://developer.kontur.ru/doc/diadoc-api/proto/RecipientResponseStatus.html
 */
export type DiadocRecipientResponseStatus =
  | 'RecipientResponseStatusUnknown'
  | 'RecipientResponseStatusNotAcceptable'
  | 'WaitingForRecipientSignature'
  | 'WithRecipientSignature'
  | 'RecipientSignatureRequestRejected'
  // Альтернативные форматы из API
  | 'RecipientResponseStatus_Unknown'
  | 'RecipientResponseStatus_Accepted'
  | 'RecipientResponseStatus_Rejected'
  | string; // Для совместимости с другими вариантами

/**
 * Статус двустороннего документа
 * @see https://developer.kontur.ru/doc/diadoc-api/proto/obsolete/BilateralDocumentMetadata.html
 */
export type DiadocBilateralDocumentStatus =
  | 'UnknownBilateralDocumentStatus'
  | 'OutboundWaitingForRecipientSignature'
  | 'OutboundWithRecipientSignature'
  | 'OutboundRecipientSignatureRequestRejected'
  | 'OutboundWaitingForSenderSignature'
  | 'OutboundInvalidSenderSignature'
  | 'InboundWaitingForRecipientSignature'
  | 'InboundWithRecipientSignature'
  | 'InboundRecipientSignatureRequestRejected'
  | 'InboundInvalidRecipientSignature'
  | 'InternalWaitingForRecipientSignature'
  | 'InternalWithRecipientSignature'
  | 'InternalRecipientSignatureRequestRejected';

/**
 * Ответ метода GetOrganizationsByInnKpp
 * @see https://developer.kontur.ru/doc/diadoc-api/http/GetOrganizationsByInnKpp.html
 */
export interface DiadocOrganizationsResponse {
  Organizations?: DiadocOrganizationResponse[];
}

/**
 * Организация из ответа API
 */
export interface DiadocOrganizationResponse {
  OrgId: string;
  Inn: string;
  Kpp?: string;
  FullName: string;
  ShortName?: string;
  Boxes?: DiadocBoxResponse[];
  IsActive?: boolean;
  IsRoaming?: boolean;
}

/**
 * Ящик организации из ответа API
 */
export interface DiadocBoxResponse {
  BoxId: string;
  Title?: string;
  Organization?: {
    OrgId: string;
    Inn: string;
  };
}

/**
 * Тело запроса PostMessage
 * @see https://developer.kontur.ru/doc/diadoc-api/http/PostMessage.html
 */
export interface DiadocPostMessageRequest {
  FromBoxId: string;
  ToBoxId?: string;
  DocumentAttachments?: DiadocDocumentAttachment[];
  ToDepartmentId?: string;
  IsInternal?: boolean;
  IsDraft?: boolean;
  LockDraft?: boolean;
  StrictDraftValidation?: boolean;
  ProxyBoxId?: string;
  ProxyDepartmentId?: string;
}

/**
 * Вложение документа в запросе
 */
export interface DiadocDocumentAttachment {
  SignedContent: {
    Content: string; // Base64 encoded
    Signature?: string;
  };
  TypeNamedId: string;
  FileName?: string;
  Comment?: string;
  NeedRecipientSignature?: boolean;
  CustomDocumentId?: string;
  Metadata?: DiadocMetadataItem[];
}

/**
 * Элемент метаданных
 */
export interface DiadocMetadataItem {
  Key: string;
  Value: string;
}

/**
 * Type guard для проверки DiadocMessageResponse
 */
export function isDiadocMessageResponse(obj: unknown): obj is DiadocMessageResponse {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'MessageId' in obj &&
    typeof (obj as DiadocMessageResponse).MessageId === 'string'
  );
}

/**
 * Type guard для проверки DiadocEntity
 */
export function isDiadocEntity(obj: unknown): obj is DiadocEntity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'EntityId' in obj &&
    typeof (obj as DiadocEntity).EntityId === 'string'
  );
}

/**
 * Type guard для проверки DiadocOrganizationsResponse
 */
export function isDiadocOrganizationsResponse(obj: unknown): obj is DiadocOrganizationsResponse {
  return typeof obj === 'object' && obj !== null && ('Organizations' in obj || Object.keys(obj).length === 0);
}

/**
 * VF-2: Типы XML документов для генерации
 * @see https://developer.kontur.ru/doc/diadoc-api/
 */
export enum DiadocXmlDocumentType {
  /** Счёт-фактура */
  INVOICE = 'Invoice',
  /** Корректировочная счёт-фактура */
  INVOICE_CORRECTION = 'InvoiceCorrection',
  /** ТОРГ-12 */
  TORG12 = 'Torg12',
  /** Акт выполненных работ */
  ACCEPTANCE_CERTIFICATE = 'AcceptanceCertificate',
  /** Универсальный передаточный документ (УПД) */
  UNIVERSAL_TRANSFER_DOCUMENT = 'UniversalTransferDocument',
  /** XML ТОРГ-12 */
  XML_TORG12 = 'XmlTorg12',
  /** XML Акт выполненных работ */
  XML_ACCEPTANCE_CERTIFICATE = 'XmlAcceptanceCertificate',
  /** Неформализованный документ */
  NONFORMALIZED = 'Nonformalized',
}

/**
 * Функция XML документа
 * @see https://developer.kontur.ru/doc/diadoc-api/
 */
export enum DiadocDocumentFunction {
  /** Счёт-фактура и документ о передаче товаров (СЧФ) */
  SCHF = 'СЧФ',
  /** Счёт-фактура и документ о передаче товаров (работ, услуг), передаточный документ (СЧФДОП) */
  SCHFDOP = 'СЧФДОП',
  /** Документ о передаче товаров (работ, услуг) (ДОП) */
  DOP = 'ДОП',
}

/**
 * VF-2: Данные организации для XML документа
 */
export interface IDiadocXmlOrganization {
  /** ИНН */
  inn: string;
  /** КПП */
  kpp?: string;
  /** Полное наименование */
  fullName: string;
  /** Краткое наименование */
  shortName?: string;
  /** Адрес */
  address?: string;
  /** Юридический адрес */
  legalAddress?: string;
  /** Банковские реквизиты */
  bankDetails?: {
    bankName: string;
    bik: string;
    accountNumber: string;
    corrAccountNumber?: string;
  };
}

/**
 * VF-2: Данные товарной позиции для XML документа
 */
export interface IDiadocXmlInvoiceItem {
  /** Порядковый номер */
  number: number;
  /** Наименование товара/услуги */
  name: string;
  /** Единица измерения (код ОКЕИ) */
  unitCode?: string;
  /** Единица измерения (наименование) */
  unitName?: string;
  /** Количество */
  quantity?: number;
  /** Цена за единицу */
  price?: number;
  /** Стоимость без НДС */
  amountWithoutVat: number;
  /** Ставка НДС (0, 10, 20, или 'без НДС') */
  vatRate?: number | 'без НДС';
  /** Сумма НДС */
  vatAmount?: number;
  /** Стоимость с НДС */
  amountWithVat: number;
  /** Код товара (ТНВЭД, HS Code) */
  productCode?: string;
  /** Страна происхождения (код) */
  countryOfOriginCode?: string;
  /** Страна происхождения (наименование) */
  countryOfOriginName?: string;
  /** Номер таможенной декларации */
  customsDeclarationNumber?: string;
}

/**
 * VF-2: Данные для генерации XML документа
 */
export interface IDiadocXmlDocumentData {
  /** Тип документа */
  documentType: DiadocXmlDocumentType;
  /** Функция документа (для УПД) */
  documentFunction?: DiadocDocumentFunction;
  /** Номер документа */
  documentNumber: string;
  /** Дата документа */
  documentDate: Date;
  /** Продавец */
  seller: IDiadocXmlOrganization;
  /** Покупатель */
  buyer: IDiadocXmlOrganization;
  /** Товарные позиции */
  items: IDiadocXmlInvoiceItem[];
  /** Валюта (код ISO 4217) */
  currencyCode: string;
  /** Валюта (наименование) */
  currencyName?: string;
  /** Общая сумма без НДС */
  totalAmountWithoutVat: number;
  /** Общая сумма НДС */
  totalVatAmount?: number;
  /** Общая сумма с НДС */
  totalAmountWithVat: number;
  /** Комментарий */
  comment?: string;
  /** Основание (номер и дата договора) */
  contractReference?: {
    number: string;
    date: Date;
  };
  /** Данные о поручении принципала */
  principalOrderReference?: {
    number: string;
    date: Date;
  };
}

/**
 * VF-2: Результат генерации XML документа
 */
export interface IDiadocXmlGenerationResult {
  /** XML контент (строка) */
  xmlContent: string;
  /** Тип документа */
  documentType: DiadocXmlDocumentType;
  /** Имя файла */
  fileName: string;
  /** Размер в байтах */
  size: number;
}

/**
 * VF-2: Интерфейс для обновления docs в FormPayment
 * Используется вместо as any для типобезопасности
 */
export interface IFormPaymentDocsUpdate {
  paymentOrder?: string;
  paymentOrderDocx?: string;
  paymentAdvanceOrder?: string;
  paymentAdvanceOrderDocx?: string;
  paymentOrderSigned?: string[];
  treasurerOrder?: string;
  treasurerOrderSigned?: string;
  exportRevenueConfirmation?: string;
  report?: string;
  docxFile?: string;
  reportSigned?: string;
  payments?: string[];
  closing?: string[];
  archive?: string;
  refund?: string[];
  additional?: string[];
  swift?: string[];
  // Diadoc поля
  paymentOrderDiadocDocumentId?: string;
  paymentOrderDiadocMessageId?: string;
  reportDiadocDocumentId?: string;
  reportDiadocMessageId?: string;
  paymentOrderSignMethod?: 'manual' | 'diadoc';
  reportSignMethod?: 'manual' | 'diadoc';
  paymentOrderIsDiadocSigning?: boolean;
  paymentOrderDiadocSentAt?: Date;
  reportIsDiadocSigning?: boolean;
  reportDiadocSentAt?: Date;
}

/**
 * VF-2: Интерфейс для обновления Contract
 * Используется вместо as any для типобезопасности
 */
export interface IContractDiadocUpdate {
  diadocDocumentId?: string;
  diadocMessageId?: string;
  signatureType?: 'manual' | 'diadoc';
  diadocSignedAt?: Date;
  isDiadocSigning?: boolean;
  diadocSentAt?: Date;
  file?: string;
  status?: string;
  rejectText?: string;
}

/**
 * Type guard для проверки DiadocXmlDocumentType
 */
export function isDiadocXmlDocumentType(type: string): type is DiadocXmlDocumentType {
  return Object.values(DiadocXmlDocumentType).includes(type as DiadocXmlDocumentType);
}

/**
 * Проверяет, является ли тип документа XML типом (не Nonformalized)
 */
export function isXmlDocumentType(type: DiadocXmlDocumentType | string): boolean {
  return (
    type !== DiadocXmlDocumentType.NONFORMALIZED &&
    Object.values(DiadocXmlDocumentType).includes(type as DiadocXmlDocumentType)
  );
}
