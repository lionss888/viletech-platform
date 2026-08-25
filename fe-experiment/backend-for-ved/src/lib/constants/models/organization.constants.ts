import { OrganizationSignerPositionType } from '../../enums/models/organization.enums';

export const OrganizationSignerPositionTranslates: Record<OrganizationSignerPositionType, string> = {
  [OrganizationSignerPositionType.GENERAL_DIRECTOR]: 'Генеральный директор',
  [OrganizationSignerPositionType.EXECUTIVE_DIRECTOR]: 'Исполнительный директор',
  [OrganizationSignerPositionType.MANAGING_DIRECTOR]: 'Управляющий директор',
  [OrganizationSignerPositionType.FINANCE_DIRECTOR]: 'Финансовый директор',
  [OrganizationSignerPositionType.COMMERCIAL_DIRECTOR]: 'Коммерческий директор',
  [OrganizationSignerPositionType.LOGISTICS_DIRECTOR]: 'Директор по логистике',
  [OrganizationSignerPositionType.SUPPLY_CHAIN_DIRECTOR]: 'Директор по цепочке поставок',
  [OrganizationSignerPositionType.CUSTOMS_COMPLIANCE_OFFICER]: 'Специалист по таможенному регулированию',
  [OrganizationSignerPositionType.FOREIGN_TRADE_MANAGER]: 'Менеджер по внешнеэкономической деятельности',
  [OrganizationSignerPositionType.IMPORT_EXPORT_MANAGER]: 'Менеджер по импорту и экспорту',
  [OrganizationSignerPositionType.CHIEF_ACCOUNTANT]: 'Главный бухгалтер',
  [OrganizationSignerPositionType.OTHER]: 'n/a',
};
