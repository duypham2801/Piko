import { Link } from 'react-router';

import { buttonClassName } from '../components/ui/buttonClassName';
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
        <Link className={buttonClassName()} to="/">
          {t('backHome')}
        </Link>
      </Screen>
    </>
  );
}
