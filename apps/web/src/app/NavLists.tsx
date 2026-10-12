import { useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import OptionGlyph from '../components/ui/OptionGlyph';
import { t } from '../i18n';
import { useDecisionList } from '../features/decisions/useDecisionList';
import { historyEntryHref } from '../features/history/historyEntryHref';
import { useHistoryList } from '../features/history/useHistoryList';
import styles from './NavLists.module.css';

export default function NavLists() {
  const { pathname } = useLocation();
  const decisionState = useDecisionList(pathname);
  const historyState = useHistoryList(5, pathname);
  const decisionListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const list = decisionListRef.current;
    const currentRow = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!list || !currentRow) {
      return;
    }

    const listRect = list.getBoundingClientRect();
    const rowRect = currentRow.getBoundingClientRect();
    if (rowRect.top < listRect.top) {
      list.scrollTop -= listRect.top - rowRect.top;
    } else if (rowRect.bottom > listRect.bottom) {
      list.scrollTop += rowRect.bottom - listRect.bottom;
    }
  }, [decisionState.decisions.length, decisionState.status, pathname]);

  return (
    <div className={styles.lists}>
      {(decisionState.status === 'error' || decisionState.decisions.length > 0) && (
        <section className={styles.decisionsSection}>
          <h2 className={styles.heading}>{t('yourDecisions')}</h2>
          {decisionState.status === 'error' ? (
            <p className={styles.muted}>{t('listFailed')}</p>
          ) : (
            <ul ref={decisionListRef} className={styles.list}>
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
                      <OptionGlyph
                        className={styles.emoji}
                        emoji={firstEmoji}
                        label={decision.title}
                      />
                      <span className={styles.label}>{decision.title}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {(historyState.status === 'error' ||
        (historyState.status === 'loaded' && historyState.entries.length > 0)) && (
        <section className={styles.recentSection}>
          <header className={styles.sectionHeader}>
            <h2 className={styles.heading}>{t('recent')}</h2>
            {historyState.status !== 'error' && (
              <Link className={styles.seeAll} to="/history">
                {t('seeAll')}
              </Link>
            )}
          </header>
          {historyState.status === 'error' ? (
            <p className={styles.muted}>{t('historyLoadFailed')}</p>
          ) : (
            <ul className={styles.list}>
              {historyState.entries.map((entry) => {
                const href = historyEntryHref(entry);
                const row = (
                  <>
                    <OptionGlyph
                      className={styles.emoji}
                      emoji={entry.winner.emoji}
                      label={entry.winner.label}
                    />
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
