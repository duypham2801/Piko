import { useId, type ComponentPropsWithoutRef } from 'react';

import styles from './TextField.module.css';

type TextFieldProps = ComponentPropsWithoutRef<'input'> & {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
};

export default function TextField({
  label,
  hideLabel = false,
  hint,
  error,
  id,
  className,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [ariaDescribedBy, hint ? hintId : '', error ? errorId : '']
    .filter(Boolean)
    .join(' ');
  const inputClasses = [styles.input, error ? styles.error : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.field}>
      <label className={hideLabel ? 'visually-hidden' : styles.label} htmlFor={inputId}>
        {label}
      </label>
      <input
        {...props}
        aria-describedby={describedBy || undefined}
        aria-invalid={error ? true : ariaInvalid}
        className={inputClasses}
        id={inputId}
      />
      {hint && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className={styles.errorMessage} id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
