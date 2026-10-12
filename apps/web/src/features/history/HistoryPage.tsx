import { useRef } from 'react';
import { Link } from 'react-router';

import Button from '../../components/ui/Button';
import { buttonClassName } from '../../components/ui/buttonClassName';
import LoadingText from '../../components/ui/LoadingText';
import Screen from '../../app/Screen';
import { t } from '../../i18n';
import SharedLinkList from '../share/SharedLinkList';
import { useShareList } from '../share/useShareList';
import HistoryList from './HistoryList';
import styles from './HistoryPage.module.css';
import { useHistoryList } from './useHistoryList';

export default function HistoryPage() {
  const { entries, retry, status } = useHistoryList();
  const { removeShare, shares, status: sharesStatus } = useShareList();
  const sharedLinksHeadingRef = useRef<HTMLHeadingElement>(null);
  const historyEntriesHeadingRef = useRef<HTMLHeadingElement>(null);
  const now = new Date();

  const handleRevoked = (id: string) => {
    const rowsRemain = shares.length > 1;
    removeShare(id);
    requestAnimationFrame(() =>
      (rowsRemain ? sharedLinksHeadingRef : historyEntriesHeadingRef).current?.focus(),
    );
  };

  return (
    <>
      <title>{`${t('historyTitle')} · ${t('title')}`}</title>
      <Screen backTo="/" className={styles.content}>
        <h1>{t('historyTitle')}</h1>

        {(sharesStatus === 'error' || (sharesStatus === 'loaded' && shares.length > 0)) && (
          <section className={styles.section}>
            <h2 ref={sharedLinksHeadingRef} tabIndex={-1}>
              {t('sharedLinks')}
            </h2>
            {sharesStatus === 'error' ? (
              <p className={styles.sharesError}>{t('sharesLoadFailed')}</p>
            ) : (
              <SharedLinkList now={now} shares={shares} onRevoked={handleRevoked} />
            )}
          </section>
        )}

        <section className={styles.section}>
          <h2 ref={historyEntriesHeadingRef} tabIndex={-1}>
            {t('historyEntries')}
          </h2>
          {status === 'loading' && <LoadingText />}
          {status === 'error' && (
            <div className={styles.state}>
              <p className={styles.error}>{t('historyLoadFailed')}</p>
              <Button onClick={retry}>{t('retry')}</Button>
            </div>
          )}
          {status === 'loaded' && entries.length === 0 && (
            <div className={styles.state}>
              <p className={styles.muted}>{t('historyEmpty')}</p>
              <Link className={buttonClassName()} to="/">
                {t('backHome')}
              </Link>
            </div>
          )}
          {status === 'loaded' && entries.length > 0 && <HistoryList entries={entries} now={now} />}
        </section>
      </Screen>
    </>
  );
}
