import moment, { Moment } from 'moment';

export const formatDate = (date: Date | Moment, format?: string) => moment(date).format(format || 'DD.MM.YYYY');

/**
 * Преобразует дату из московского времени в UTC
 * Интерпретирует входящую дату как московское время (UTC+3) и конвертирует в UTC
 * @param date - Дата, которая должна интерпретироваться как московское время
 * @returns Дата в UTC
 */
export const convertMoscowTimeToUTC = (date: Date): Date => {
  // Интерпретируем дату как московское время (UTC+3) и конвертируем в UTC
  // Вычитаем 3 часа (3 * 60 * 60 * 1000 миллисекунд)
  const moscowOffsetMs = 3 * 60 * 60 * 1000;
  return new Date(date.getTime() - moscowOffsetMs);
};
