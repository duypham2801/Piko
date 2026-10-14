import Badge from '../../components/ui/Badge';
import { t } from '../../i18n';
import styles from './ModeSelector.module.css';

type Mode = {
  value: string;
  emoji: string;
  label: string;
  disabled?: boolean;
};

type ModeSelectorProps = {
  variant?: 'sheet' | 'compact';
};

const modes: readonly Mode[] = [
  { value: 'solo', emoji: '🙋', label: t('modeSolo') },
  { value: 'couple', emoji: '👫', label: t('modeCouple'), disabled: true },
  { value: 'squad', emoji: '👥', label: t('modeSquad'), disabled: true },
];

export default function ModeSelector({ variant = 'sheet' }: ModeSelectorProps) {
  const compact = variant === 'compact';

  return (
    <fieldset className={`${styles.selector} ${compact ? styles.compact : ''}`}>
      <legend className={compact ? 'visually-hidden' : undefined}>{t('modeLegend')}</legend>
      <div className={styles.options}>
        {modes.map((mode) => {
          const name = mode.disabled ? `${mode.label} · ${t('soon')}` : mode.label;

          return (
            <label className={styles.option} key={mode.value} title={compact ? name : undefined}>
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
              {compact ? (
                <>
                  <span className="visually-hidden">{name}</span>
                  {mode.disabled && (
                    <span aria-hidden="true" className={styles.lock}>
                      🔒
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className={styles.label}>{mode.label}</span>
                  {mode.disabled && <Badge>{t('soon')}</Badge>}
                </>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
