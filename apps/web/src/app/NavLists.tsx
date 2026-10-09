import { Link, NavLink, useLocation } from 'react-router';

import { t } from '../i18n';
import { useDecisionList } from '../features/decisions/useDecisionList';
import { historyEntryHref } from '../features/history/historyEntryHref';
import { useHistoryList } from '../features/history/useHistoryList';
import styles from './NavLists.module.css';

export default function NavLists() {
  const { pathname } = useLocation();
  const decisionState = useDecisionList(pathname);
  const historyState = useHistoryList(5, pathname);

  return (
    <div className={styles.lists}>
      <section className={styles.decisionsSection}>
        <h2 className={styles.heading}>{t('yourDecisions')}</h2>
        {decisionState.status === 'loaded' && decisionState.decisions.length > 0 && (
          <ul className={styles.list}>
            {decisionState.decisions.map((record) => {
              const { decision } = record;
              const firstEmoji = decision.options.find((option) => option.emoji)?.emoji;

              return (
                <li key={decision.id}>
                  <NavLink
                    className={`${styles.row} ${styles.link}`}
                    state={{ record }}
                    to={`/decisions/${decision.id}`}
                  >
                    {firstEmoji && (
                      <span aria-hidden="true" className={styles.emoji}>
                        {firstEmoji}
                      </span>
                    )}
                    <span className={styles.label}>{decision.title}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        )}
        {decisionState.status === 'loaded' && decisionState.decisions.length === 0 && (
          <p className={styles.muted}>{t('noDecisionsYet')}</p>
        )}
        {decisionState.status === 'error' && <p className={styles.muted}>{t('listFailed')}</p>}
      </section>

      {(historyState.status === 'error' ||
        (historyState.status === 'loaded' && historyState.entries.length > 0)) && (
        <section className={styles.recentSection}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.heading}>{t('recent')}</h2>
            <Link className={styles.seeAll} to="/history">
              {t('seeAll')}
            </Link>
          </header>
          {historyState.status === 'error' ? (
            <p className={styles.muted}>{t('historyLoadFailed')}</p>
          ) : (
            <ul className={styles.list}>
              {historyState.entries.map((entry) => {
                const href = historyEntryHref(entry);
                const row = (
                  <>
                    {entry.winner.emoji && (
                      <span aria-hidden="true" className={styles.emoji}>
                        {entry.winner.emoji}
                      </span>
                    )}
                    <span className={styles.details}>
                      <span className={styles.label}>{entry.winner.label}</span>
                      <span className={styles.meta}>{entry.title}</span>
                    </span>
                  </>
                );

                return (
                  <li key={entry.id}>
                    {href ? (
                      <Link className={`${styles.row} ${styles.link}`} to={href}>
                        {row}
                      </Link>
                    ) : (
                      <div className={styles.row}>{row}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
