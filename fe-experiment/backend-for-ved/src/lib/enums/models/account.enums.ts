export enum AccountPattern {
  FIND_ONE = 'fea360.account.find.one',
  FIND_OR_CREATE = 'fea360.account.find.or.create',
  CREATE = 'fea360.auth.account.create',
  CREATE_ADMIN = 'fea360.auth.account.create.admin',
  UPDATE_BY_ID = 'fea360.auth.account.update.by.id',
  FIND_ONE_OR_EXCEPTION = 'fea360.auth.account.find.one.or.exception',
  EXISTS = 'fea360.auth.account.exists',
  VERIFY_PASSWORD = 'fea360.auth.account.verify.password',
  VERIFY_CODE = 'fea360.auth.account.verify.code',
  MIGRATE = 'fea360.auth.account.migrate',
  FIND_WITH_PAGINATE = 'fea360.auth.account.find.with.paginate',
  FIND_MANY = 'fea360.auth.account.find.many',
  UPDATE_BY_PAIRS = 'fea360.auth.account.update.by.pairs',
  VERIFY_SECURITY_CODE = 'fea360.auth.account.verify.security.code',
  MAKE_SECURITY_CODE = 'fea360.auth.account.make.security.code',
  FIND_DUPLICATES_FIELDS = 'fea360.auth.account.find.duplicates.fields',
  FIND_TOTAL_PARTNERS = 'fea360.auth.account.find.total.partners',
  BULK_WRITE = 'fea360.auth.account.bulk.write',
  UPDATE_ONE = 'fea360.auth.account.update.one',
  UPDATE_MANY = 'fea360.auth.account.update.many',
}

export enum AccountEventPattern {
  INITIALIZATION = 'fea360.auth.account.initialization',
  UPDATE_ONE = 'fea360.auth.account.update.one',
}

export enum AccountLoginUpdateType {
  password = 'password',
  email = 'email',
}
export enum AccountRole {
  ROOT = 'root',
  USER = 'user',
  MANAGER = 'manager',
  TREASURER = 'treasurer',
  PROVIDER = 'provider',
  SENIOR_PROVIDER = 'senior_provider',
  REPORTER = 'reporter',
  COMPLIANCE_OFFICER = 'compliance_officer',
  ONE_C = 'one_c',
  INTERNAL_COMPLIANCE_OFFICER = 'internal_compliance_officer',
}
