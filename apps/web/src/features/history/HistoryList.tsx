import { Link } from 'react-router';
import type { HistoryEntryData } from '@piko/domain';

import Card from '../../components/ui/Card';
import { findPreset } from '../presets/presets';
import { formatHistoryTime } from './historyTime';
import styles from './HistoryList.module.css';

function historyEntryHref(entry: HistoryEntryData): string | undefined {
  if (entry.source.kind === 'decision') {
    return entry.source.decisionId ? `/decisions/${entry.source.decisionId}` : undefined;
  }
  if (entry.source.kind === 'preset') {
    return findPreset(entry.source.slug) ? `/presets/${entry.source.slug}` : undefined;
  }
  return undefined;
}

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
              {entry.winner.emoji && (
                <span aria-hidden="true" className={styles.winnerEmoji}>
                  {entry.winner.emoji}
                </span>
              )}
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
