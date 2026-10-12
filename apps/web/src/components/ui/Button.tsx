import type { ComponentPropsWithoutRef } from 'react';

import { type ButtonSize, type ButtonVariant, buttonClassName } from './buttonClassName';

type ButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
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
  return (
    <button
      {...props}
      className={buttonClassName({ className, fullWidth, size, variant })}
      type={type}
    />
  );
}
