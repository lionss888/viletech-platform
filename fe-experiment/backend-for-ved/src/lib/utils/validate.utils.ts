import { IsString, Matches, registerDecorator, ValidationOptions } from 'class-validator';
import { applyDecorators } from '@nestjs/common';
import { isMobilePhone } from 'lib/utils/helpers/validate.helper';
import { IAgent } from '../interfaces/models/agent.interface';

export const IsAlias = () =>
  applyDecorators(
    IsString(),
    Matches(/^[A-Za-z0-9\-]+$/, { message: 'Alias must contain only latin letter, numbers or -' }),
  );

export const IsDomain = (validationOptions?: ValidationOptions) =>
  function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: {
        ...validationOptions,
        message: validationOptions?.message || 'Url must set only base domain and have https protocol.',
      },
      validator: {
        validate(value: string) {
          let url: URL;

          try {
            url = new URL(value);
          } catch (e) {
            return false;
          }

          return !(url.search || url.pathname !== '/' || url.protocol !== 'https:');
        },
      },
    });
  };

export const IsMobilePhone = (validateOptions?: ValidationOptions) =>
  function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [],
      options: { ...validateOptions, message: 'Phone is not valid.' },
      validator: {
        validate(value: any) {
          return isMobilePhone(value);
        },
      },
    });
  };

export const isIAgent = (agent: string | IAgent): agent is IAgent => {
  return typeof agent === 'object' && agent !== null && 'organizationName' in agent;
};
