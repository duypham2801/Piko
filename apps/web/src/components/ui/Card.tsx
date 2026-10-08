import type { ComponentPropsWithoutRef } from 'react';

import styles from './Card.module.css';

type CardProps = ComponentPropsWithoutRef<'div'> & {
  tone?: 'surface' | 'primary' | 'secondary' | 'accent';
};

export default function Card({ tone = 'surface', className, ...props }: CardProps) {
  const classes = [styles.card, styles[tone], className].filter(Boolean).join(' ');

  return <div {...props} className={classes} />;
}
