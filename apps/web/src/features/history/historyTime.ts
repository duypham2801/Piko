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

function isSameLocalDay(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function formatHistoryTime(createdAt: string, now: Date): string {
  const createdDate = new Date(createdAt);
  const time = timeFormatter.format(createdDate);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

  if (isSameLocalDay(createdDate, now)) {
    return `${t('today')}, ${time}`;
  }
  if (isSameLocalDay(createdDate, yesterday)) {
    return `${t('yesterday')}, ${time}`;
  }
  return `${dateFormatter.format(createdDate)}, ${time}`;
}
