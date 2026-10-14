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
      <>
        <title>{`${t('loading')} · ${t('title')}`}</title>
        <Screen align="start" backTo={backTo} className={contentClassName} width={width}>
          <h1 className="visually-hidden">{t('loading')}</h1>
          <LoadingText />
        </Screen>
      </>
    );
  }

  return (
    <>
      <title>{`${t('loadErrorTitle')} · ${t('title')}`}</title>
      <Screen align="center" className={styles.content}>
        <h1 className={styles.error}>{t('loadFailed')}</h1>
        <Button onClick={state.retry}>{t('retry')}</Button>
      </Screen>
    </>
  );
}
