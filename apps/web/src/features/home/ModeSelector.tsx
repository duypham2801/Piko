import Badge from '../../components/ui/Badge';
import { t } from '../../i18n';
import styles from './ModeSelector.module.css';

type Mode = {
  value: string;
  emoji: string;
  label: string;
  compactLabel: string;
  disabled?: boolean;
};

type ModeSelectorProps = {
  variant?: 'sheet' | 'compact';
};

const modes: readonly Mode[] = [
  { value: 'solo', emoji: '🙋', label: t('modeSolo'), compactLabel: t('modeSolo') },
  {
    value: 'couple',
    emoji: '👫',
    label: t('modeCouple'),
    compactLabel: t('modeCoupleShort'),
    disabled: true,
  },
  {
    value: 'squad',
    emoji: '👥',
    label: t('modeSquad'),
    compactLabel: t('modeSquadShort'),
    disabled: true,
  },
];

export default function ModeSelector({ variant = 'sheet' }: ModeSelectorProps) {
  const compact = variant === 'compact';

  return (
    <fieldset className={`${styles.selector} ${compact ? styles.compact : ''}`}>
      <legend className={compact ? 'visually-hidden' : undefined}>{t('modeLegend')}</legend>
      <div className={styles.options}>
        {modes.map((mode) => (
          <label className={styles.option} key={mode.value}>
            <input
              className="visually-hidden"
              defaultChecked={mode.value === 'solo'}
              disabled={mode.disabled}
              name="mode"
              type="radio"
              value={mode.value}
            />
            <span aria-hidden="true" className={styles.emoji}>
              {mode.emoji}
            </span>
            <span className={styles.label}>{compact ? mode.compactLabel : mode.label}</span>
            {mode.disabled &&
              (compact ? (
                <span className={styles.soon}> · {t('soon')}</span>
              ) : (
                <Badge>{t('soon')}</Badge>
              ))}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
