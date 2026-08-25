export enum ContractPattern {
  FIND_ONE = 'fea360.contract.find.one',
  FIND_MANY = 'fea360.contract.find.many',
  UPDATE_MANY = 'fea360.contract.update.many',
  FIND_PAGINATE = 'fea360.contract.find.paginate',
}
export enum ContractStatus {
  CREATED = 'created',
  WAITING_DIADOC = 'waiting_diadoc', // VF-2: договор отправлен на подписание в ЭДО (Diadoc)
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}
