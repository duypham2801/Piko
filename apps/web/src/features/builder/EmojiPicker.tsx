import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

import { t } from '../../i18n';
import { EMOJIS } from './emojis';
import styles from './EmojiPicker.module.css';

type EmojiPickerProps = {
  emoji?: string;
  index: number;
  open: boolean;
  onChange: (emoji: string | undefined) => void;
  onToggle: () => void;
  onClose: () => void;
};

export default function EmojiPicker({
  emoji,
  index,
  open,
  onChange,
  onToggle,
  onClose,
}: EmojiPickerProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const label = `${t('chooseEmoji')} ${index + 1}`;

  const closeAndFocus = () => {
    onClose();
    triggerRef.current?.focus();
  };

  const choose = (nextEmoji: string | undefined) => {
    onChange(nextEmoji);
    closeAndFocus();
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeAndFocus();
    }
  };

  return (
    <div className={styles.picker}>
      <button
        aria-expanded={open}
        aria-label={label}
        className={`${styles.trigger} ${emoji ? styles.hasEmoji : styles.empty}`}
        ref={triggerRef}
        type="button"
        onClick={onToggle}
      >
        <span aria-hidden="true">{emoji ?? '+'}</span>
      </button>

      {open && (
        <div
          aria-label={label}
          className={styles.panel}
          role="group"
          onKeyDown={handlePanelKeyDown}
        >
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
      )}
    </div>
  );
}
