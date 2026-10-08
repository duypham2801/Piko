export const vi = {
  title: 'PIKO',
  tagline: 'Pick. Open. Go.',
  loading: 'Đang tải phiên guest…',
  error: 'Không thể tải dữ liệu từ API.',
  health: 'Sức khỏe API',
  database: 'Cơ sở dữ liệu',
  version: 'Phiên bản',
  guest: 'guest',
  registered: 'registered',
  currentGuest: 'Guest hiện tại',
  userKind: 'Loại người dùng',
  ok: 'ok',
  degraded: 'degraded',
  down: 'down',
  retry: 'Thử lại',
} as const;

export type TranslationKey = keyof typeof vi;
