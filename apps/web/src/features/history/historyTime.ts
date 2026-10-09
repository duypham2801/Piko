import { t } from '../../i18n';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
});

function localDayKey(date: Date): string {
  const parts = dateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

export function formatHistoryTime(createdAt: string, now: Date): string {
  const createdDate = new Date(createdAt);
  const time = timeFormatter.format(createdDate);
  const createdDay = localDayKey(createdDate);
  const today = localDayKey(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  if (createdDay === today) {
    return `${t('today')}, ${time}`;
  }
  if (createdDay === localDayKey(yesterday)) {
    return `${t('yesterday')}, ${time}`;
  }
  return `${dateFormatter.format(createdDate)}, ${time}`;
}
