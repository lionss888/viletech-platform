export const formatNumber = (value: number): string | null => {
  if (!value && value !== 0) {
    return null;
  }

  const formattedValue = value / 100;

  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(formattedValue);
};
