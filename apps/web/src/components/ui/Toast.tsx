import { useEffect } from 'react';

import styles from './Toast.module.css';

export const TOAST_VISIBLE_MS = 3_000;

type ToastProps = {
  message: string;
  onDone: () => void;
};

export default function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onDone, TOAST_VISIBLE_MS);
    return () => window.clearTimeout(timeout);
  }, [onDone]);

  return (
    <div className={styles.toast} role="status">
      {message}
    </div>
  );
}
