export const vi = {
  title: 'PIKO',
  tagline: 'Pick. Open. Go.',
  openCase: 'Mở case',
  opening: 'Đang mở…',
  winnerIs: 'Kết quả',
  spinAgain: 'Mở lại',
  back: 'Trở về',
  homeQuestion: 'Hôm nay chọn gì?',
  homeLead: 'Khỏi đắn đo, PIKO mở case chọn giùm bạn.',
  modeLegend: 'Chế độ',
  modeSolo: 'Một mình',
  modeCouple: 'Cặp đôi',
  modeSquad: 'Nhóm bạn',
  soon: 'Sắp có',
  quickPicks: 'Chọn nhanh',
  notFoundTitle: 'Không tìm thấy trang',
  backHome: 'Về trang chủ',
  previewLead: 'Tắt những lựa chọn bạn không muốn, rồi mở case.',
  minOptionsHint: 'Cần ít nhất 2 lựa chọn.',
} as const;

export type TranslationKey = keyof typeof vi;
