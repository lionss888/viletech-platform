export enum HsCodeLoyalty {
  OK = 'ok',
  NOT_QUITE_OK = 'not_quite_ok',
  NOT_OK = 'not_ok',
  REJECT = 'reject', // Critical risk - auto-reject
}

export enum HsCodePattern {
  CREATE = 'hs-code.create',
  FIND_WITH_PAGINATE = 'hs-code.find',
  FIND_ONE_OR_EXCEPTION = 'hs-code.find.one.or.exception',
  EXIST = 'hs-code.exist',
  UPDATE_ONE = 'hs-code.update.one',
  DELETE_ONE = 'hs-code.delete.one',
  FIND_BY_CODE = 'hs-code.find.by.code',
  FIND_ACTIVE = 'hs-code.find.active',
  DEACTIVATE = 'hs-code.deactivate',
  ACTIVATE = 'hs-code.activate',
}
