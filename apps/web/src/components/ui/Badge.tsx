import type { ComponentPropsWithoutRef } from 'react';

import styles from './Badge.module.css';

type BadgeProps = ComponentPropsWithoutRef<'span'> & {
  tone?: 'neutral' | 'accent';
};

export default function Badge({ tone = 'accent', className, ...props }: BadgeProps) {
  const classes = [styles.badge, styles[tone], className ?? ''].filter(Boolean).join(' ');

  return <span {...props} className={classes} />;
}
