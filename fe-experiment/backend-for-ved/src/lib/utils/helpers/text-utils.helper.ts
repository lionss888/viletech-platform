import petrovich from 'petrovich';
import _ from 'lodash';
import { convert as convertNumberToWords } from 'number-to-words-ru';
import { PetrovichCaseType, PetrovichGenderType } from 'lib/enums/petrovich.enums';
import { AllCurrencies } from 'lib/enums/common.enums';
import { currencyTextNamesConfig } from 'modules/currency/currency.contants';
import RussianNouns, { Case, Gender } from 'russian-nouns-js';
import { SexByRussianName } from 'sex-by-russian-name';

const sexByRussianName = new SexByRussianName();

export interface INumberToWordsProps {
  value: number;
  currency?: AllCurrencies;
  withCurrencyText?: boolean;
}

export class TextUtilsHelper {
  private static rne = new RussianNouns.Engine();

  static moneyToWords({ value, currency, withCurrencyText = true }: INumberToWordsProps): string {
    const currencyTextNames = currencyTextNamesConfig[currency];
    const formattedValue = Number((value / 100).toFixed(2));

    if (!withCurrencyText || !currency) {
      return convertNumberToWords(formattedValue, {
        currency: 'number',
        convertNumberToWords: { fractional: true },
      });
    }

    if (!currencyTextNames.fractionalPartNameCases) {
      return (
        convertNumberToWords(formattedValue, {
          currency: 'number',
          showNumberParts: {
            fractional: true,
          },
          convertNumberToWords: { fractional: true },
        }) +
        ' ' +
        currencyTextNames.currencyNameCases[0]
      );
    }

    return convertNumberToWords(formattedValue, {
      currency: currencyTextNames,
      convertNumberToWords: { fractional: true },
    });
  }

  static declineText(text: string, grammaticalCase = Case.NOMINATIVE, gender = Gender.COMMON): string {
    return text
      .split(' ')
      .map((word) => {
        const lemma = RussianNouns.createLemma({
          text: word,
          gender,
        });

        return this.rne.decline(lemma, grammaticalCase);
      })
      .join(' ');
  }

  static formatFullName(fullName: string, grammaticalCase: PetrovichCaseType = PetrovichCaseType.NOMINATIVE): string {
    if (!_.trim(fullName)) {
      return '';
    }

    // Разбиваем ФИО на части (фамилия, имя, отчество)
    const parts = fullName.split(/\s+/);

    const person = {
      ...(parts[1] ? { first: parts[1] } : {}), // имя
      ...(parts[2] ? { middle: parts[2] } : {}), // отчество
      last: parts[0] || '', // фамилия
      ...(parts[0]
        ? {
            gender:
              sexByRussianName.getSex(parts[2] ? { patronymic: parts[2] } : { lastName: parts[0] }) ||
              PetrovichGenderType.ANDROGYNOUS,
          }
        : {}),
    };

    // Склоняем фамилию, имя и отчество
    const declinedPerson = petrovich(person, grammaticalCase);

    // Форматируем ФИО (делаем первую букву каждого слова заглавной, а остальные — маленькими)
    const formatName = _.reduce(
      [declinedPerson.last, declinedPerson.first, declinedPerson.middle],
      (formatted, part) => (part ? `${formatted} ${this.toUpperCaseFirstChar(part)}` : formatted),
      '',
    );

    return _.trim(formatName);
  }

  // Делаем заглавной только первую букву
  static toUpperCaseFirstChar(name: string) {
    // Если слово через дефис
    if (name.split('-').length === 2) {
      return _.map(name.split('-'), (part) => this.toUpperCaseFirstChar(part)).join('-');
    }

    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
}
