import type { ChangeEvent } from 'react';

import { t } from '../../i18n';
import styles from './PriorityDots.module.css';

type PriorityDotsProps = {
  index: number;
  label: string;
  optionId: string;
  weight: number;
  onChange: (weight: number) => void;
};

export default function PriorityDots({
  index,
  label,
  optionId,
  weight,
  onChange,
}: PriorityDotsProps) {
  const legend = `${t('priority')} — ${label || `${t('optionLabel')} ${index + 1}`}`;
  const name = `priority-${optionId}`;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  };

  return (
    <fieldset className={styles.fieldset}>
      <legend className="visually-hidden">{legend}</legend>
      <div className={styles.options}>
        {[1, 2, 3, 4, 5].map((level) => (
          <label className={styles.option} key={level}>
            <input
              aria-label={`${t('priorityLevel')} ${level}`}
              checked={weight === level}
              className="visually-hidden"
              name={name}
              type="radio"
              value={level}
              onChange={handleChange}
            />
            <span
              aria-hidden="true"
              className={`${styles.dot} ${level <= weight ? styles.filled : styles.outlined}`}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
