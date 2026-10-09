import { DecisionOption } from '@piko/domain';

export const EMOJIS = [
  '🍜',
  '🍕',
  '🍔',
  '🍣',
  '🍱',
  '🥗',
  '🍗',
  '🥖',
  '🌮',
  '🍲',
  '☕',
  '🧋',
  '🍵',
  '🥤',
  '🍺',
  '🍷',
  '🧃',
  '🍹',
  '🏠',
  '🏞️',
  '🏖️',
  '🛍️',
  '🎬',
  '🏟️',
  '🏛️',
  '⛰️',
  '🎮',
  '🎤',
  '📚',
  '🏃',
  '🚴',
  '🏊',
  '🎨',
  '🎲',
  '🎁',
  '✈️',
  '🛌',
  '💡',
  '❤️',
  '⭐',
] as const;

if (import.meta.env.DEV) {
  for (const emoji of EMOJIS) {
    DecisionOption.parse({
      id: '00000000-0000-4000-8000-000000000000',
      label: 'emoji',
      emoji,
      weight: 1,
      enabled: true,
    });
  }
}
