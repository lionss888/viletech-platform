export enum OrganizationPattern {
  FIND_ONE_OR_EXCEPTION = 'fea360.organization.find.one.or.exception',
  UPDATE_ONE = 'fea360.organization.update.one',
  UPDATE_MANY = 'fea360.organization.update.many',
}

export enum OrganizationSignerPositionType {
  GENERAL_DIRECTOR = 'general_director', // Генеральный директор
  EXECUTIVE_DIRECTOR = 'executive_director', // Исполнительный директор
  MANAGING_DIRECTOR = 'managing_director', // Управляющий директор
  FINANCE_DIRECTOR = 'finance_director', // Финансовый директор
  COMMERCIAL_DIRECTOR = 'commercial_director', // Коммерческий директор
  LOGISTICS_DIRECTOR = 'logistics_director', // Директор по логистике
  SUPPLY_CHAIN_DIRECTOR = 'supply_chain_director', // Директор по цепочке поставок
  CUSTOMS_COMPLIANCE_OFFICER = 'customs_compliance_officer', // Специалист по таможенному регулированию
  FOREIGN_TRADE_MANAGER = 'foreign_trade_manager', // Менеджер по внешнеэкономической деятельности
  IMPORT_EXPORT_MANAGER = 'import_export_manager', // Менеджер по импорту и экспорту
  CHIEF_ACCOUNTANT = 'chief_accountant', // Главный бухгалтер
  OTHER = 'other', // Кастомная позиция (указывается в поле signerOtherPosition)
}

export enum OrganizationType {
  USER = 'user', // Организации клиентов
  PROVIDER = 'provider',
}

export enum OrganizationStatus {
  NOT_APPROVED = 'not_approved',
  APPROVED = 'approved',
  BLOCKED = 'blocked',
}

export enum OrganizationBusinessFormType {
  OOO = 'ООО',
  OAO = 'ОАО',
  PAO = 'ПАО',
  IP = 'ИП',
  AO = 'АО',
  OCOO = 'ОсОО',
  TOO = 'ТОО',
  FZKO = 'ФЗКО',
}

export enum OrganizationSubaccountStatusType {
  INVITED = 'invited', // приглашение отправлено
  REJECTED = 'rejected', // приглашение отклонено
  ACTIVE = 'active', // приглашение принято
  BLOCKED = 'blocked', // субаккаунт заблокирован
}
