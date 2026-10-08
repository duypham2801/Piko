import type { ComponentPropsWithoutRef } from 'react';

import styles from './Chip.module.css';

type ChipProps = Omit<ComponentPropsWithoutRef<'button'>, 'aria-pressed' | 'onClick'> & {
  selected: boolean;
  onSelectedChange?: (selected: boolean) => void;
};

export default function Chip({
  selected,
  onSelectedChange,
  className,
  type = 'button',
  ...props
}: ChipProps) {
  const classes = [styles.chip, selected ? styles.selected : styles.unselected, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...props}
      aria-pressed={selected}
      className={classes}
      onClick={() => onSelectedChange?.(!selected)}
      type={type}
    />
  );
}
