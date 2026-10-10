import { Link } from 'react-router';
import type { HistoryEntryData } from '@piko/domain';

import Card from '../../components/ui/Card';
import OptionGlyph from '../../components/ui/OptionGlyph';
import { historyEntryHref } from './historyEntryHref';
import { formatHistoryTime } from './historyTime';
import styles from './HistoryList.module.css';

type HistoryListProps = {
  entries: readonly HistoryEntryData[];
  now: Date;
};

export default function HistoryList({ entries, now }: HistoryListProps) {
  return (
    <Card className={styles.listCard} tone="surface">
      <ul className={styles.list}>
        {entries.map((entry) => {
          const href = historyEntryHref(entry);
          const row = (
            <>
              <OptionGlyph
                className={styles.winnerEmoji}
                emoji={entry.winner.emoji}
                label={entry.winner.label}
              />
              <span className={styles.details}>
                <span className={styles.winnerLabel}>{entry.winner.label}</span>
                <span className={styles.meta}>
                  {entry.title} ·{' '}
                  <time dateTime={entry.createdAt}>{formatHistoryTime(entry.createdAt, now)}</time>
                </span>
              </span>
            </>
          );

          return (
            <li className={styles.item} key={entry.id}>
              {href ? (
                <Link className={`${styles.row} ${styles.linkedRow}`} to={href}>
                  {row}
                </Link>
              ) : (
                <div className={styles.row}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
