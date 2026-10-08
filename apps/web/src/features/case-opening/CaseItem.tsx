import type { DecisionOptionData } from '@piko/domain';

import styles from './CaseItem.module.css';

type CaseItemProps = {
  option: DecisionOptionData;
  isWinner: boolean;
  revealed: boolean;
  dimmed: boolean;
};

export default function CaseItem({ option, isWinner, revealed, dimmed }: CaseItemProps) {
  const classes = [styles.item, revealed && isWinner && styles.winner, dimmed && styles.dimmed]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} title={option.label}>
      <span aria-hidden="true" className={styles.emoji}>
        {option.emoji}
      </span>
      <span className={styles.label}>{option.label}</span>
    </div>
  );
}
