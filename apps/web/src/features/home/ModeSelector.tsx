import Badge from '../../components/ui/Badge';
import { t } from '../../i18n';
import styles from './ModeSelector.module.css';

type Mode = {
  value: string;
  emoji: string;
  label: string;
  disabled?: boolean;
};

const modes: readonly Mode[] = [
  { value: 'solo', emoji: '🙋', label: t('modeSolo') },
  { value: 'couple', emoji: '👫', label: t('modeCouple'), disabled: true },
  { value: 'squad', emoji: '👥', label: t('modeSquad'), disabled: true },
];

export default function ModeSelector() {
  return (
    <fieldset className={styles.selector}>
      <legend>{t('modeLegend')}</legend>
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
            <span className={styles.label}>{mode.label}</span>
            {mode.disabled && <Badge>{t('soon')}</Badge>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
