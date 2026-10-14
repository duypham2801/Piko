import { useState } from 'react';
import { Link, NavLink } from 'react-router';

import Sheet from '../components/ui/Sheet';
import ModeSelector from '../features/home/ModeSelector';
import { t } from '../i18n';
import { DESKTOP_QUERY, useMediaQuery } from '../lib/useMediaQuery';
import NavLists from './NavLists';
import styles from './AppNav.module.css';

export default function AppNav() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const [modeSheetOpen, setModeSheetOpen] = useState(false);

  return (
    <nav aria-label={t('navLabel')} className={styles.nav}>
      <Link className={styles.logo} to="/">
        <span className={styles.wordmark}>{t('title')}</span>
        <span className={styles.tagline}>{t('tagline')}</span>
      </Link>
      {isDesktop ? (
        <ModeSelector variant="compact" />
      ) : (
        <button
          aria-label={t('modeCurrent')}
          className={styles.modeButton}
          type="button"
          onClick={() => setModeSheetOpen(true)}
        >
          <span aria-hidden="true">🙋</span>
        </button>
      )}
      <div className={styles.links}>
        <NavLink className={styles.history} to="/history">
          {t('historyTitle')}
        </NavLink>
        <Link aria-label={t('builderNewTitle')} className={styles.create} to="/decisions/new">
          <span aria-hidden="true">+</span> {t('navCreate')}
        </Link>
      </div>
      {isDesktop && <NavLists />}
      {!isDesktop && modeSheetOpen && (
        <Sheet
          closeLabel={t('close')}
          title={t('modeLegend')}
          onClose={() => setModeSheetOpen(false)}
        >
          <ModeSelector />
        </Sheet>
      )}
    </nav>
  );
}
