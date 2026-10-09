import { DECISION_LIMITS } from '@piko/domain';
import { useRef } from 'react';
import type { DecisionDraftData } from '@piko/domain';

import Card from '../../components/ui/Card';
import TextField from '../../components/ui/TextField';
import { t } from '../../i18n';
import { optionInputId } from './draft';
import EmojiPicker from './EmojiPicker';
import PriorityDots from './PriorityDots';
import styles from './OptionRow.module.css';

type Option = DecisionDraftData['options'][number];

type OptionRowProps = {
  error?: string;
  index: number;
  open: boolean;
  option: Option;
  optionCount: number;
  onCloseEmoji: () => void;
  onRemove: () => void;
  onToggleEmoji: () => void;
  onUpdate: (update: (option: Option) => Option) => void;
};

export default function OptionRow({
  error,
  index,
  open,
  option,
  optionCount,
  onCloseEmoji,
  onRemove,
  onToggleEmoji,
  onUpdate,
}: OptionRowProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const emojiLabel = `${t('chooseEmoji')} ${index + 1}`;
  const closeEmoji = () => {
    onCloseEmoji();
    triggerRef.current?.focus();
  };

  return (
    <Card className={styles.optionCard} tone="surface">
      <div className={styles.optionMain}>
        <button
          aria-expanded={open}
          aria-label={emojiLabel}
          className={`${styles.trigger} ${option.emoji ? styles.hasEmoji : styles.empty}`}
          ref={triggerRef}
          type="button"
          onClick={onToggleEmoji}
        >
          <span aria-hidden="true">{option.emoji ?? '+'}</span>
        </button>
        <TextField
          className={styles.optionInput}
          error={error}
          hideLabel
          id={optionInputId(option.id)}
          label={`${t('optionLabel')} ${index + 1}`}
          maxLength={DECISION_LIMITS.labelMaxLength}
          placeholder={t('optionPlaceholder')}
          value={option.label}
          onChange={(event) =>
            onUpdate((current) => ({
              ...current,
              label: event.target.value,
            }))
          }
        />
        <button
          aria-label={`${t('removeOption')} ${index + 1}`}
          className={styles.removeButton}
          disabled={optionCount <= DECISION_LIMITS.minOptions}
          type="button"
          onClick={onRemove}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {open && (
        <EmojiPicker
          emoji={option.emoji}
          label={emojiLabel}
          onChange={(emoji) => onUpdate((current) => ({ ...current, emoji }))}
          onClose={closeEmoji}
        />
      )}
      <div className={styles.optionMeta}>
        <span>{t('priority')}</span>
        <PriorityDots
          index={index}
          label={option.label}
          optionId={option.id}
          weight={option.weight}
          onChange={(weight) => onUpdate((current) => ({ ...current, weight }))}
        />
      </div>
    </Card>
  );
}
