import type { ComponentPropsWithoutRef } from 'react';
import { Link } from 'react-router';

import styles from './BackLink.module.css';

type BackLinkProps = ComponentPropsWithoutRef<typeof Link>;

export default function BackLink({ children, className, ...props }: BackLinkProps) {
  const classes = [styles.link, className].filter(Boolean).join(' ');

  return (
    <Link {...props} className={classes}>
      <span aria-hidden="true">←</span> {children}
    </Link>
  );
}
