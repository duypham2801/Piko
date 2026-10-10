import type { ComponentPropsWithoutRef } from 'react';

import styles from './Button.module.css';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
};

type ButtonClassNameProps = {
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  fullWidth?: ButtonProps['fullWidth'];
  className?: ButtonProps['className'];
};

// eslint-disable-next-line react-refresh/only-export-components
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: ButtonClassNameProps = {}) {
  return [styles.button, styles[variant], styles[size], fullWidth && styles.fullWidth, className]
    .filter(Boolean)
    .join(' ');
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={buttonClassName({ className, fullWidth, size, variant })}
      type={type}
    />
  );
}
