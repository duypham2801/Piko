import { useNavigate } from 'react-router';

import BackLink from '../../components/ui/BackLink';
import Button from '../../components/ui/Button';
import { t } from '../../i18n';
import HistoryList from './HistoryList';
import styles from './HistoryPage.module.css';
import { useHistoryList } from './useHistoryList';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { entries, retry, status } = useHistoryList();
  const now = new Date();

  return (
    <>
      <title>{`${t('historyTitle')} · ${t('title')}`}</title>
      <main className={styles.screen}>
        <div className={styles.content}>
          <BackLink to="/">{t('back')}</BackLink>
          <h1>{t('historyTitle')}</h1>

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
          {status === 'loaded' && entries.length > 0 && <HistoryList entries={entries} now={now} />}
        </div>
      </main>
    </>
  );
}
