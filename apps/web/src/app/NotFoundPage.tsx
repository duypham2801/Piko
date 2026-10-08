import { Link } from 'react-router';

import { t } from '../i18n';
import styles from './NotFoundPage.module.css';

export default function NotFoundPage() {
  return (
    <>
      <title>{`${t('notFoundTitle')} · ${t('title')}`}</title>
      <main className={styles.screen}>
        <div className={styles.content}>
          <h1>{t('notFoundTitle')}</h1>
          <Link className={styles.backHome} to="/">
            {t('backHome')}
          </Link>
        </div>
      </main>
    </>
  );
}
