import { IBaseOptions } from 'lib/services/base/base.service.interface';

export const checkFieldInclude = ({ include }: Pick<IBaseOptions, 'include'>, field: string): boolean => {
  return include.findIndex((value) => value === field) >= 0;
};

export const removeFieldInclude = ({ include }: Pick<IBaseOptions, 'include'>, field: string): boolean => {
  const findIndex = include?.findIndex((value) => value === field);
  if (findIndex >= 0) {
    include.splice(findIndex, 1);
    return true;
  }

  return false;
};
