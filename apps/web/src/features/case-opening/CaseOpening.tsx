import { useCallback, useMemo, useRef, useState } from 'react';
import { DECISION_LIMITS } from '@piko/domain';
import type { DecisionOptionData, HistorySourceInputData } from '@piko/domain';

import BackLink from '../../components/ui/BackLink';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { t } from '../../i18n';
import { createHistoryEntry } from '../../lib/api/history';
import CaseCarousel from './CaseCarousel';
import styles from './CaseOpening.module.css';
import Confetti from './Confetti';
import { useCaseOpening } from './useCaseOpening';

type CaseOpeningProps = {
  title: string;
  options: readonly DecisionOptionData[];
  backTo: string;
  source: HistorySourceInputData;
  category?: string;
};

type HistorySaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const lastTwoOptionsHintId = 'case-min-options-hint';

function excludeOptions(
  options: readonly DecisionOptionData[],
  excludedIds: ReadonlySet<string>,
): DecisionOptionData[] {
  return options.map((option) =>
    excludedIds.has(option.id) ? { ...option, enabled: false } : option,
  );
}

export default function CaseOpening({
  title,
  options,
  backTo,
  source,
  category,
}: CaseOpeningProps) {
  const [excludedIds, setExcludedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [historySaveStatus, setHistorySaveStatus] = useState<HistorySaveStatus>('idle');
  const saveRequestRef = useRef(0);
  const pool = useMemo(() => excludeOptions(options, excludedIds), [excludedIds, options]);
  const { state, plan, open, viewportRef, stripRef } = useCaseOpening(pool);
  const resetSaveStatus = useCallback(() => {
    saveRequestRef.current += 1;
    setHistorySaveStatus('idle');
  }, []);
  const spin = useCallback(() => {
    resetSaveStatus();
    open();
  }, [open, resetSaveStatus]);
  const rejectWinner = useCallback(() => {
    if (state.status !== 'revealed') {
      return;
    }

    const nextExcludedIds = new Set(excludedIds);
    nextExcludedIds.add(state.result.winnerId);
    const nextPool = excludeOptions(options, nextExcludedIds);
    const enabledCount = nextPool.filter((option) => option.enabled).length;
    if (enabledCount < DECISION_LIMITS.minEnabledOptions) {
      return;
    }

    resetSaveStatus();
    setExcludedIds(nextExcludedIds);
    open(nextPool);
  }, [excludedIds, open, options, resetSaveStatus, state]);
  const saveResult = useCallback(async () => {
    if (
      state.status !== 'revealed' ||
      historySaveStatus === 'saving' ||
      historySaveStatus === 'saved'
    ) {
      return;
    }

    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    setHistorySaveStatus('saving');

    try {
      await createHistoryEntry({
        source,
        decision: {
          ...(category === undefined ? {} : { category }),
          options: state.options,
          title,
        },
        result: state.result,
      });
      if (saveRequestRef.current === requestId) {
        setHistorySaveStatus('saved');
      }
    } catch {
      if (saveRequestRef.current === requestId) {
        setHistorySaveStatus('error');
      }
    }
  }, [category, historySaveStatus, source, state, title]);
  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option] as const)),
    [options],
  );
  const revealed = state.status === 'revealed';
  const winner = revealed ? optionsById.get(state.result.winnerId) : undefined;
  const notTodayDisabled =
    !revealed || state.result.candidateIds.length <= DECISION_LIMITS.minEnabledOptions;
  const historyStatusMessage =
    historySaveStatus === 'saved'
      ? t('historySaved')
      : historySaveStatus === 'error'
        ? t('historySaveFailed')
        : '';

  return (
    <main className={styles.screen}>
      <div className={styles.content}>
        <BackLink to={backTo}>{t('back')}</BackLink>

        <header className={styles.header}>
          <h1>{title}</h1>
        </header>

        <div className={styles.stage}>
          <CaseCarousel
            optionsById={optionsById}
            plan={plan}
            revealed={revealed}
            stripRef={stripRef}
            viewportRef={viewportRef}
          />
          {revealed && <Confetti />}
        </div>

        <div aria-live="polite" className={styles.result} role="status">
          {winner && (
            <Card className={styles.winnerPanel} tone="accent">
              <span aria-hidden="true" className={styles.winnerEmoji}>
                {winner.emoji}
              </span>
              <span className={styles.winnerDetails}>
                <span className={styles.winnerLabel}>{t('winnerIs')}</span>
                <span className={styles.winnerName}>{winner.label}</span>
              </span>
            </Card>
          )}
        </div>

        {revealed ? (
          <div className={styles.actions}>
            <Button
              disabled={historySaveStatus === 'saving' || historySaveStatus === 'saved'}
              fullWidth
              size="lg"
              onClick={saveResult}
            >
              {historySaveStatus === 'saving'
                ? t('saving')
                : historySaveStatus === 'saved'
                  ? t('saved')
                  : t('goNow')}
            </Button>
            <div className={styles.secondaryActions}>
              <Button fullWidth variant="outline" onClick={spin}>
                {t('spinAgain')}
              </Button>
              <Button
                aria-describedby={notTodayDisabled ? lastTwoOptionsHintId : undefined}
                disabled={notTodayDisabled}
                fullWidth
                variant="outline"
                onClick={rejectWinner}
              >
                {t('notToday')}
              </Button>
            </div>
            {notTodayDisabled && (
              <p className={styles.hint} id={lastTwoOptionsHintId}>
                {t('lastTwoOptionsHint')}
              </p>
            )}
            <p
              aria-live="polite"
              className={
                historySaveStatus === 'saved'
                  ? 'visually-hidden'
                  : historySaveStatus === 'error'
                    ? styles.historyStatusError
                    : ''
              }
            >
              {historyStatusMessage}
            </p>
          </div>
        ) : (
          <Button disabled={state.status === 'spinning'} size="lg" onClick={spin}>
            {state.status === 'ready' ? t('openCase') : t('opening')}
          </Button>
        )}
      </div>
    </main>
  );
}
