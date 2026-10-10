import Button from '../../components/ui/Button';
import NotFoundPage from '../../app/NotFoundPage';
import Screen from '../../app/Screen';
import { t } from '../../i18n';
import type { DecisionRecordLoadState } from './useDecisionRecord';
import styles from './DecisionLoadState.module.css';

type DecisionLoadStateProps = {
  state: Exclude<DecisionRecordLoadState, { status: 'loaded' }>;
};

export default function DecisionLoadState({ state }: DecisionLoadStateProps) {
  if (state.status === 'notFound') {
    return <NotFoundPage />;
  }

  return (
    <Screen align="center" className={styles.content}>
      {state.status === 'loading' ? (
        <p className={styles.muted}>{t('loading')}</p>
      ) : (
        <>
          <p className={styles.error}>{t('loadFailed')}</p>
          <Button onClick={state.retry}>{t('retry')}</Button>
        </>
      )}
    </Screen>
  );
}
