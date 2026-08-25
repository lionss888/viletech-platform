import { isMobilePhone as baseIsMobilePhone, isString, matches } from 'class-validator';

export function isMobilePhone(value: string) {
  if (baseIsMobilePhone(value)) {
    return true;
  }

  const isNumber = /\+?\d{7,19}/;

  return isNumber.test(value);
}

export function isCVV(value: any) {
  return isString(value) && matches(value, /^\d{3}$/);
}
