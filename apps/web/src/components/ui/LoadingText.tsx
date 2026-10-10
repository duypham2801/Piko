import { t } from '../../i18n';
import styles from './LoadingText.module.css';

type LoadingTextProps = {
  className?: string;
};

export default function LoadingText({ className }: LoadingTextProps) {
  const classes = [styles.loading, className].filter(Boolean).join(' ');

  return (
    <p className={classes} role="status">
      {t('loading')}
    </p>
  );
}
