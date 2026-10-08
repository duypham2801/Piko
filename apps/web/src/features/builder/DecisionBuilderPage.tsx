import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { DECISION_LIMITS, DecisionRecord } from '@piko/domain';
import type { DecisionDraftData, DecisionRecordData } from '@piko/domain';

import Button from '../../components/ui/Button';
import NotFoundPage from '../../app/NotFoundPage';
import { t } from '../../i18n';
import { ApiClientError } from '../../lib/api/client';
import { fetchDecision } from '../../lib/api/decisions';
import DecisionForm from './DecisionForm';
import styles from './DecisionBuilderPage.module.css';

type LoadState =
  | { status: 'loading'; id: string }
  | { status: 'loaded'; id: string; record: DecisionRecordData }
  | { status: 'notFound'; id: string }
  | { status: 'error'; id: string };

function emptyDraft(): DecisionDraftData {
  return {
    title: '',
    options: [emptyOption(), emptyOption()],
  };
}

function emptyOption() {
  return {
    id: crypto.randomUUID(),
    label: '',
    weight: DECISION_LIMITS.weightDefault,
    enabled: true,
  };
}

function draftOf(record: DecisionRecordData): DecisionDraftData {
  return {
    category: record.decision.category,
    options: record.decision.options.map((option) => ({ ...option })),
    title: record.decision.title,
  };
}

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

  if (isNew) {
    return (
      <>
        <title>{`${pageTitle} · ${t('title')}`}</title>
        <DecisionForm initial={newInitial} />
      </>
    );
  }

  if (passedRecord) {
    return (
      <>
        <title>{`${pageTitle} · ${t('title')}`}</title>
        <DecisionForm decisionId={id} initial={draftOf(passedRecord)} initialStatus="saved" />
      </>
    );
  }

  const currentLoad = loadState?.id === id ? loadState : undefined;
  if (currentLoad?.status === 'notFound') {
    return <NotFoundPage />;
  }

  if (currentLoad?.status === 'error') {
    return (
      <>
        <title>{`${pageTitle} · ${t('title')}`}</title>
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
      </>
    );
  }

  if (currentLoad?.status === 'loaded') {
    return (
      <>
        <title>{`${pageTitle} · ${t('title')}`}</title>
        <DecisionForm decisionId={id} initial={draftOf(currentLoad.record)} />
      </>
    );
  }

  return (
    <>
      <title>{`${pageTitle} · ${t('title')}`}</title>
      <main className={styles.screen}>
        <div className={styles.content}>
          <p className={styles.muted}>{t('loading')}</p>
        </div>
      </main>
    </>
  );
}
