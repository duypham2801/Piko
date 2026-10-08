import { DECISION_LIMITS } from '@piko/domain';
import type { DecisionDraftData } from '@piko/domain';

import Card from '../../components/ui/Card';
import TextField from '../../components/ui/TextField';
import { t } from '../../i18n';
import EmojiPicker from './EmojiPicker';
import PriorityDots from './PriorityDots';
import styles from './DecisionForm.module.css';

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
  return (
    <Card className={styles.optionCard} tone="surface">
      <div className={styles.optionMain}>
        <EmojiPicker
          emoji={option.emoji}
          index={index}
          open={open}
          onChange={(emoji) => onUpdate((current) => ({ ...current, emoji }))}
          onClose={onCloseEmoji}
          onToggle={onToggleEmoji}
        />
        <TextField
          className={styles.optionInput}
          error={error}
          hideLabel
          id={`decision-option-${option.id}`}
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
