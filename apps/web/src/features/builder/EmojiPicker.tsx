import type { KeyboardEvent } from 'react';

import { t } from '../../i18n';
import { EMOJIS } from './emojis';
import styles from './EmojiPicker.module.css';

type EmojiPickerProps = {
  emoji?: string;
  label: string;
  onChange: (emoji: string | undefined) => void;
  onClose: () => void;
};

export default function EmojiPicker({ emoji, label, onChange, onClose }: EmojiPickerProps) {
  const choose = (nextEmoji: string | undefined) => {
    onChange(nextEmoji);
    onClose();
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div aria-label={label} className={styles.panel} role="group" onKeyDown={handlePanelKeyDown}>
      <div className={styles.grid}>
        <button
          aria-pressed={!emoji}
          className={`${styles.emojiButton} ${styles.noEmoji}`}
          type="button"
          onClick={() => choose(undefined)}
        >
          {t('noEmoji')}
        </button>
        {EMOJIS.map((item) => (
          <button
            aria-label={item}
            aria-pressed={emoji === item}
            className={styles.emojiButton}
            key={item}
            type="button"
            onClick={() => choose(item)}
          >
            <span aria-hidden="true">{item}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
