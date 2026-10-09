import { Link, NavLink } from 'react-router';

import { t } from '../i18n';
import styles from './AppNav.module.css';

export default function AppNav() {
  return (
    <nav aria-label={t('navLabel')} className={styles.nav}>
      <Link className={styles.logo} to="/">
        {t('title')}
      </Link>
      <div className={styles.links}>
        <Link aria-label={t('builderNewTitle')} className={styles.create} to="/decisions/new">
          <span aria-hidden="true">+</span> {t('navCreate')}
        </Link>
        <NavLink className={styles.history} to="/history">
          {t('historyTitle')}
        </NavLink>
      </div>
    </nav>
  );
}
