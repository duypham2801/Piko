import { Outlet } from 'react-router';

import { t } from '../i18n';
import AppNav from './AppNav';
import styles from './AppShell.module.css';

export default function AppShell() {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main">
        {t('skipToContent')}
      </a>
      <AppNav />
      <Outlet />
    </div>
  );
}
