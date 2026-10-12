import Button from '../../components/ui/Button';
import LoadingText from '../../components/ui/LoadingText';
import NotFoundPage from '../../app/NotFoundPage';
import Screen from '../../app/Screen';
import { t } from '../../i18n';
import type { DecisionRecordLoadState } from './useDecisionRecord';
import styles from './DecisionLoadState.module.css';

type DecisionLoadStateProps = {
  textAlign?: 'start' | 'center';
  backTo: string;
  width?: 'narrow' | 'wide';
  state: Exclude<DecisionRecordLoadState, { status: 'loaded' }>;
};

export default function DecisionLoadState({
  textAlign = 'center',
  backTo,
  state,
  width = 'narrow',
}: DecisionLoadStateProps) {
  if (state.status === 'notFound') {
    return <NotFoundPage />;
  }

  if (state.status === 'loading') {
    const contentClassName = [styles.content, textAlign === 'start' ? styles.start : '']
      .filter(Boolean)
      .join(' ');

    return (
      <Screen align="start" backTo={backTo} className={contentClassName} width={width}>
        <LoadingText />
      </Screen>
    );
  }

  return (
    <Screen align="center" className={styles.content}>
      <p className={styles.error}>{t('loadFailed')}</p>
      <Button onClick={state.retry}>{t('retry')}</Button>
    </Screen>
  );
}
