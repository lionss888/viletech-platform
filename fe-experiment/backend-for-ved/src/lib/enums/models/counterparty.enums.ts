export enum CounterpartyType {
  RUSSIAN = 'russian', // Russian counterparty
  FOREIGN = 'foreign', // Foreign counterparty
}

export enum CounterpartyApprovalStatus {
  PENDING = 'pending', // Not approved yet
  APPROVED = 'approved', // Approved by compliance officer
  REJECTED = 'rejected', // Rejected by compliance officer
}

export enum CounterpartyPattern {
  FIND_ONE_OR_EXCEPTION = 'fea360.counterparty.find.one.or.exception',
  UPDATE_ONE = 'fea360.counterparty.update.one',
  FIND_BY_ORGANIZATION = 'fea360.counterparty.find.by.organization',
}
