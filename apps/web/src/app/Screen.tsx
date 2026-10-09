import type { ReactNode } from 'react';
import { type To } from 'react-router';

import BackLink from '../components/ui/BackLink';
import { t } from '../i18n';
import styles from './Screen.module.css';

type ScreenProps = {
  backTo?: To;
  width?: 'narrow' | 'wide';
  align?: 'start' | 'center';
  focus?: boolean;
  className?: string;
  children: ReactNode;
};

export default function Screen({
  backTo,
  width = 'narrow',
  align = 'start',
  focus = false,
  className,
  children,
}: ScreenProps) {
  const screenClassName = [styles.screen, align === 'center' ? styles.center : '']
    .filter(Boolean)
    .join(' ');
  const contentClassName = [styles.content, width === 'wide' ? styles.wide : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <main className={screenClassName} data-focus={focus ? true : undefined}>
      {backTo !== undefined && (
        <div className={styles.top}>
          <BackLink to={backTo}>{t('back')}</BackLink>
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </main>
  );
}
