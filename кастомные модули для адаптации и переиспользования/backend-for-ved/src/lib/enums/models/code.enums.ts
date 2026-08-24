export enum CodePattern {
  VERIFY = 'auth.code.verify',
  GENERATE = 'auth.code.generate',
  REMOVE_BY_ACCOUNT = 'auth.code.remove.by.account',
  CREATE_MANY_FULL = 'auth.code.create.many.full',
}

export enum CodeType {
  LOGIN = 'login',
  REGISTRATION = 'registration',
  RESTORE = 'restore',
}
