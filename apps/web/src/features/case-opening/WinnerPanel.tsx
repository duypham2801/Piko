import type { DecisionOptionData } from '@piko/domain';

import Card from '../../components/ui/Card';
import styles from './WinnerPanel.module.css';

type WinnerPanelProps = {
  option: DecisionOptionData;
  label: string;
};

export default function WinnerPanel({ option, label }: WinnerPanelProps) {
  return (
    <Card className={styles.winnerPanel} tone="accent">
      <span aria-hidden="true" className={styles.winnerEmoji}>
        {option.emoji}
      </span>
      <span className={styles.winnerDetails}>
        <span className={styles.winnerLabel}>{label}</span>
        <span className={styles.winnerName}>{option.label}</span>
      </span>
    </Card>
  );
}
