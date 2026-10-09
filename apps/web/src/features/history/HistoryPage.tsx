import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import BackLink from '../../components/ui/BackLink';
import Button from '../../components/ui/Button';
import { t } from '../../i18n';
import SharedLinkList from '../share/SharedLinkList';
import { useShareList } from '../share/useShareList';
import HistoryList from './HistoryList';
import styles from './HistoryPage.module.css';
import { useHistoryList } from './useHistoryList';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { entries, retry, status } = useHistoryList();
  const { removeShare, shares, status: sharesStatus } = useShareList();
  const sharedLinksHeadingRef = useRef<HTMLHeadingElement>(null);
  const historyEntriesHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusAfterRevokeRef = useRef(false);
  const now = new Date();

  const handleRevoked = useCallback(
    (id: string) => {
      focusAfterRevokeRef.current = true;
      removeShare(id);
    },
    [removeShare],
  );

  useEffect(() => {
    if (!focusAfterRevokeRef.current || sharesStatus !== 'loaded') {
      return;
    }

    focusAfterRevokeRef.current = false;
    const heading =
      shares.length > 0 ? sharedLinksHeadingRef.current : historyEntriesHeadingRef.current;
    const frame = requestAnimationFrame(() => heading?.focus());
    return () => cancelAnimationFrame(frame);
  }, [shares, sharesStatus]);

  return (
    <>
      <title>{`${t('historyTitle')} · ${t('title')}`}</title>
      <main className={styles.screen}>
        <div className={styles.content}>
          <BackLink to="/">{t('back')}</BackLink>
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
            {status === 'loading' && <p className={styles.muted}>{t('loading')}</p>}
            {status === 'error' && (
              <div className={styles.state}>
                <p className={styles.error}>{t('historyLoadFailed')}</p>
                <Button onClick={retry}>{t('retry')}</Button>
              </div>
            )}
            {status === 'loaded' && entries.length === 0 && (
              <div className={styles.state}>
                <p className={styles.muted}>{t('historyEmpty')}</p>
                <Button onClick={() => navigate('/')}>{t('backHome')}</Button>
              </div>
            )}
            {status === 'loaded' && entries.length > 0 && (
              <HistoryList entries={entries} now={now} />
            )}
          </section>
        </div>
      </main>
    </>
  );
}
