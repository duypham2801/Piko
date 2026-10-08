export const vi = {
  title: 'PIKO',
  tagline: 'Pick. Open. Go.',
  openCase: 'Mở case',
  opening: 'Đang mở…',
  winnerIs: 'Kết quả',
  spinAgain: 'Quay lại',
} as const;

export type TranslationKey = keyof typeof vi;
