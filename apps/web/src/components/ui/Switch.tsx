import { useId, type ComponentPropsWithoutRef } from 'react';

import styles from './Switch.module.css';

type SwitchProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'aria-checked' | 'children' | 'onClick' | 'role'
> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
};

export default function Switch({
  checked,
  onCheckedChange,
  label,
  hideLabel = false,
  className,
  type = 'button',
  ...props
}: SwitchProps) {
  const classes = [styles.switch, checked && styles.checked, className]
    .filter(Boolean)
    .join(' ');
  const generatedId = useId();
  const labelId = `${props.id ?? generatedId}-label`;

  return (
    <button
      {...props}
      aria-checked={checked}
      aria-labelledby={labelId}
      className={classes}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type={type}
    >
      <span className={hideLabel ? 'visually-hidden' : styles.label} id={labelId}>
        {label}
      </span>
      <span aria-hidden="true" className={styles.track}>
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
