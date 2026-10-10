import { Link } from 'react-router';

import { t } from '../i18n';
import Screen from './Screen';
import styles from './NotFoundPage.module.css';

type NotFoundPageProps = {
  title?: string;
  message?: string;
};

export default function NotFoundPage({ title = t('notFoundTitle'), message }: NotFoundPageProps) {
  return (
    <>
      <title>{`${title} · ${t('title')}`}</title>
      <Screen align="center" className={styles.content}>
        <h1>{title}</h1>
        {message && <p className={styles.message}>{message}</p>}
        <Link className={styles.backHome} to="/">
          {t('backHome')}
        </Link>
      </Screen>
    </>
  );
}
