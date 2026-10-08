import type { ComponentPropsWithoutRef } from 'react';

import styles from './Button.module.css';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
};

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return <button {...props} className={classes} type={type} />;
}
