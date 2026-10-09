import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';

import Button from './Button';
import styles from './Sheet.module.css';

type SheetProps = {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Sheet({ title, closeLabel, onClose, children }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  };

  return (
    <dialog
      aria-labelledby={titleId}
      className={styles.panel}
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
    >
      <div className={styles.shell}>
        <header className={styles.headingRow}>
          <h2 id={titleId}>{title}</h2>
          <Button variant="outline" onClick={closeDialog}>
            {closeLabel}
          </Button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
