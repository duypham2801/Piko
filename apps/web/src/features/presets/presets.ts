import {
  DECISION_LIMITS,
  Decision,
  type DecisionData,
  type DecisionOptionData,
} from '@piko/domain';

export type Preset = {
  slug: string;
  emoji: string;
  decision: DecisionData;
};

const option = (id: string, label: string, emoji: string) => ({
  id,
  label,
  emoji,
  weight: 1,
  enabled: true,
});

export const PRESETS: readonly Preset[] = [
  {
    slug: 'food',
    emoji: '🍽️',
    decision: {
      id: '00000000-0000-4000-8000-000000000210',
      title: 'Ăn gì?',
      category: 'food',
      options: [
        option('00000000-0000-4000-8000-000000000211', 'Phở', '🍜'),
        option('00000000-0000-4000-8000-000000000212', 'Bún chả', '🥢'),
        option('00000000-0000-4000-8000-000000000213', 'Cơm tấm', '🍚'),
        option('00000000-0000-4000-8000-000000000214', 'Bánh mì', '🥖'),
        option('00000000-0000-4000-8000-000000000215', 'Lẩu', '🍲'),
        option('00000000-0000-4000-8000-000000000216', 'Bún bò Huế', '🌶️'),
        option('00000000-0000-4000-8000-000000000217', 'Bánh xèo', '🥞'),
        option('00000000-0000-4000-8000-000000000218', 'Gà rán', '🍗'),
      ],
    },
  },
  {
    slug: 'drinks',
    emoji: '🧋',
    decision: {
      id: '00000000-0000-4000-8000-000000000220',
      title: 'Uống gì?',
      category: 'drinks',
      options: [
        option('00000000-0000-4000-8000-000000000221', 'Trà sữa', '🧋'),
        option('00000000-0000-4000-8000-000000000222', 'Cà phê sữa đá', '☕'),
        option('00000000-0000-4000-8000-000000000223', 'Sinh tố', '🥤'),
        option('00000000-0000-4000-8000-000000000224', 'Trà đào', '🍑'),
        option('00000000-0000-4000-8000-000000000225', 'Nước mía', '🎋'),
        option('00000000-0000-4000-8000-000000000226', 'Nước cam', '🍊'),
        option('00000000-0000-4000-8000-000000000227', 'Trà chanh', '🍋'),
      ],
    },
  },
  {
    slug: 'outing',
    emoji: '🎡',
    decision: {
      id: '00000000-0000-4000-8000-000000000230',
      title: 'Đi đâu chơi?',
      category: 'outing',
      options: [
        option('00000000-0000-4000-8000-000000000231', 'Xem phim', '🎬'),
        option('00000000-0000-4000-8000-000000000232', 'Đi dạo', '🚶'),
        option('00000000-0000-4000-8000-000000000233', 'Cà phê sách', '📚'),
        option('00000000-0000-4000-8000-000000000234', 'Karaoke', '🎤'),
        option('00000000-0000-4000-8000-000000000235', 'Công viên', '🌳'),
        option('00000000-0000-4000-8000-000000000236', 'Trung tâm thương mại', '🛍️'),
        option('00000000-0000-4000-8000-000000000237', 'Bảo tàng', '🏛️'),
        option('00000000-0000-4000-8000-000000000238', 'Bowling', '🎳'),
      ],
    },
  },
  {
    slug: 'weekend',
    emoji: '🗓️',
    decision: {
      id: '00000000-0000-4000-8000-000000000240',
      title: 'Làm gì cuối tuần?',
      category: 'weekend',
      options: [
        option('00000000-0000-4000-8000-000000000241', 'Ngủ nướng', '😴'),
        option('00000000-0000-4000-8000-000000000242', 'Dọn nhà', '🧹'),
        option('00000000-0000-4000-8000-000000000243', 'Đọc sách', '📖'),
        option('00000000-0000-4000-8000-000000000244', 'Chơi game', '🎮'),
        option('00000000-0000-4000-8000-000000000245', 'Nấu ăn', '🍳'),
        option('00000000-0000-4000-8000-000000000246', 'Đi phượt', '🏍️'),
        option('00000000-0000-4000-8000-000000000247', 'Tập thể dục', '🏃'),
        option('00000000-0000-4000-8000-000000000248', 'Cày phim', '📺'),
      ],
    },
  },
];

if (import.meta.env.DEV) {
  for (const preset of PRESETS) {
    Decision.parse(preset.decision);
  }
}

export function findPreset(slug: string | undefined): Preset | undefined {
  return PRESETS.find((preset) => preset.slug === slug);
}

export function parseOff(value: string | null, optionCount: number): ReadonlySet<number> {
  if (!value) {
    return new Set();
  }

  const off = new Set<number>();
  for (const token of value.split(',')) {
    if (!/^\d+$/.test(token)) {
      continue;
    }

    const index = Number(token);
    if (index < optionCount) {
      off.add(index);
    }
  }

  return optionCount - off.size < DECISION_LIMITS.minEnabledOptions ? new Set() : off;
}

export function formatOff(off: ReadonlySet<number>): string {
  return [...off].sort((left, right) => left - right).join(',');
}

export function applyOff(
  options: readonly DecisionOptionData[],
  off: ReadonlySet<number>,
): DecisionOptionData[] {
  return options.map((option, index) => ({ ...option, enabled: !off.has(index) }));
}
