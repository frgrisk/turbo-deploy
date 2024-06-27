import { TimeUnit } from '../enum/dropdown.enum';

export function convertToHours(value: number, unit: TimeUnit): number {
  switch (unit) {
    case TimeUnit.HOURS:
      return value;
    case TimeUnit.DAYS:
      return value * 24; // 24 hours in a day
    case TimeUnit.MONTHS:
      return value * 24 * 30; // Assuming approximately 30 days in a month
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}

export function convertDateTime(unix: string) {
  if (Number(unix) > 0) {
    return formatDate(new Date(Number(unix) * 1000));
  } else {
    return 'None';
  }
}

export function formatDate(date: Date) {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  return date.toLocaleString('en-US', options);
}
