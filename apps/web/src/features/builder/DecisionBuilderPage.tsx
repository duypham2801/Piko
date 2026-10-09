import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useParams } from 'react-router';
import { DecisionRecord } from '@piko/domain';
import type { DecisionRecordData } from '@piko/domain';

import Button from '../../components/ui/Button';
import NotFoundPage from '../../app/NotFoundPage';
import { t } from '../../i18n';
import { ApiClientError } from '../../lib/api/client';
import { fetchDecision } from '../../lib/api/decisions';
import DecisionForm from './DecisionForm';
import { draftOf, emptyDraft } from './draft';
import styles from './DecisionBuilderPage.module.css';

type LoadState =
  | { status: 'loading'; id: string }
  | { status: 'loaded'; id: string; record: DecisionRecordData }
  | { status: 'notFound'; id: string }
  | { status: 'error'; id: string };

export default function DecisionBuilderPage() {
  const location = useLocation();
  const { id } = useParams();
  const isNew = location.pathname === '/decisions/new';
  const [retryCount, setRetryCount] = useState(0);
  const [loadState, setLoadState] = useState<LoadState | null>(null);
  const newInitial = useMemo(() => emptyDraft(), []);
  const passedRecord = useMemo(() => {
    if (isNew || !id || !location.state || typeof location.state !== 'object') {
      return null;
    }

    const state = location.state as { record?: unknown };
    const parsed = DecisionRecord.safeParse(state.record);
    return parsed.success && parsed.data.decision.id === id ? parsed.data : null;
  }, [id, isNew, location.state]);

  useEffect(() => {
    if (isNew || !id || passedRecord) {
      return;
    }

    const controller = new AbortController();

    void fetchDecision(id, controller.signal)
      .then((record) => {
        if (!controller.signal.aborted) {
          setLoadState({ id, record, status: 'loaded' });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setLoadState({
          id,
          status: error instanceof ApiClientError && error.status === 404 ? 'notFound' : 'error',
        });
      });

    return () => controller.abort();
  }, [id, isNew, passedRecord, retryCount]);

  const pageTitle = isNew ? t('builderNewTitle') : t('builderEditTitle');
  let pageContent: ReactNode;

  if (isNew) {
    pageContent = <DecisionForm initial={newInitial} key="new" />;
  } else if (passedRecord) {
    pageContent = (
      <DecisionForm
        decisionId={id}
        initial={draftOf(passedRecord)}
        initialStatus="saved"
        key={id}
      />
    );
  } else {
    const currentLoad = loadState?.id === id ? loadState : undefined;

    if (currentLoad?.status === 'notFound') {
      pageContent = <NotFoundPage />;
    } else if (currentLoad?.status === 'error') {
      pageContent = (
        <main className={styles.screen}>
          <div className={styles.content}>
            <p className={styles.error}>{t('loadFailed')}</p>
            <Button
              onClick={() => {
                setLoadState({ id: currentLoad.id, status: 'loading' });
                setRetryCount((count) => count + 1);
              }}
            >
              {t('retry')}
            </Button>
          </div>
        </main>
      );
    } else if (currentLoad?.status === 'loaded') {
      pageContent = <DecisionForm decisionId={id} initial={draftOf(currentLoad.record)} key={id} />;
    } else {
      pageContent = (
        <main className={styles.screen}>
          <div className={styles.content}>
            <p className={styles.muted}>{t('loading')}</p>
          </div>
        </main>
      );
    }
  }

  return (
    <>
      <title>{`${pageTitle} · ${t('title')}`}</title>
      {pageContent}
    </>
  );
}
