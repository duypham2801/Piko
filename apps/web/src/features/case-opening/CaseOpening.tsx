import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import { useNavigate } from 'react-router';
import { DECISION_LIMITS } from '@piko/domain';
import type {
  DecisionDraftData,
  DecisionOptionData,
  HistorySourceInputData,
  SelectionResultData,
  SharedCaseData,
} from '@piko/domain';

import Button from '../../components/ui/Button';
import { t } from '../../i18n';
import { createHistoryEntry } from '../../lib/api/history';
import { recordShareSpin } from '../../lib/api/shares';
import CaseCarousel from './CaseCarousel';
import styles from './CaseOpening.module.css';
import Confetti from './Confetti';
import { useCaseOpening } from './useCaseOpening';
import WinnerPanel from './WinnerPanel';
import ShareDialog from '../share/ShareDialog';

type CaseOpeningProps = {
  title: string;
  options: readonly DecisionOptionData[];
  backTo: string;
  source: HistorySourceInputData;
  category?: string;
};

type HistorySaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type ShareSnapshot = {
  decision: DecisionDraftData;
  result: SelectionResultData;
};

const lastTwoOptionsHintId = 'case-min-options-hint';
const shareToggleId = 'case-share-toggle';

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
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const [excludedIds, setExcludedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [historySaveStatus, setHistorySaveStatus] = useState<HistorySaveStatus>('idle');
  const [share, setShare] = useState<SharedCaseData | null>(null);
  const [shareSnapshot, setShareSnapshot] = useState<ShareSnapshot | null>(null);
  const saveRequestRef = useRef(0);
  const pool = useMemo(() => excludeOptions(options, excludedIds), [excludedIds, options]);
  const { state, plan, open, viewportRef, stripRef } = useCaseOpening(pool);
  const resetSaveStatus = useCallback(() => {
    saveRequestRef.current += 1;
    setHistorySaveStatus('idle');
  }, []);
  const recordSpin = useCallback(
    (spin: ReturnType<typeof open>) => {
      if (!share || !spin) {
        return;
      }

      void recordShareSpin(share.id, spin).catch(() => {});
    },
    [share],
  );
  const spin = useCallback(() => {
    resetSaveStatus();
    recordSpin(open());
  }, [open, recordSpin, resetSaveStatus]);
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
    recordSpin(open(nextPool));
  }, [excludedIds, open, options, recordSpin, resetSaveStatus, state]);
  const openShareDialog = useCallback(() => {
    if (state.status !== 'revealed') {
      return;
    }

    setShareSnapshot({
      decision: {
        ...(category === undefined ? {} : { category }),
        options: state.options,
        title,
      },
      result: state.result,
    });
  }, [category, state, title]);
  const closeShareDialog = useCallback(() => {
    setShareSnapshot(null);
    requestAnimationFrame(() => document.getElementById(shareToggleId)?.focus());
  }, []);
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
  const hasVisibleStatus = notTodayDisabled || historySaveStatus === 'error';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      dialog.scrollTop = 0;
      dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    if (state.status === 'spinning') {
      titleRef.current?.focus({ preventScroll: true });
      return;
    }

    if (state.status === 'revealed') {
      dialogRef.current
        ?.querySelector<HTMLElement>('[data-reveal-focus]')
        ?.focus({ preventScroll: true });
    }
  }, [state.status]);

  useEffect(() => {
    if (historySaveStatus === 'saving') {
      titleRef.current?.focus({ preventScroll: true });
      return;
    }

    if (historySaveStatus === 'saved') {
      dialogRef.current
        ?.querySelector<HTMLElement>('[data-post-save-focus]')
        ?.focus({ preventScroll: true });
    }
  }, [historySaveStatus]);

  const closeDialog = () => {
    dialogRef.current?.close();
  };

  const handleClose = (event: SyntheticEvent<HTMLDialogElement>) => {
    // React propagates close events from nested dialogs.
    if (event.target !== event.currentTarget) {
      return;
    }

    navigate(backTo, { replace: true });
  };

  return (
    <dialog
      aria-labelledby={titleId}
      className={styles.dialog}
      ref={dialogRef}
      onClose={handleClose}
    >
      <div className={styles.content}>
        <header className={styles.header}>
          <h2 ref={titleRef} id={titleId} tabIndex={-1}>
            {title}
          </h2>
          <Button
            aria-label={t('close')}
            className={styles.closeButton}
            variant="outline"
            onClick={closeDialog}
          >
            <span aria-hidden="true">×</span>
          </Button>
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
          {winner && <WinnerPanel label={t('winnerIs')} option={winner} />}
        </div>

        {revealed ? (
          <div className={styles.actions}>
            <Button
              data-reveal-focus
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
              <Button data-post-save-focus fullWidth variant="outline" onClick={spin}>
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
            <Button
              aria-haspopup="dialog"
              fullWidth
              id={shareToggleId}
              variant="outline"
              onClick={openShareDialog}
            >
              {t('share')}
            </Button>
            <div
              className={styles.actionStatus}
              data-empty={!hasVisibleStatus ? 'true' : undefined}
            >
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
          </div>
        ) : (
          <Button
            data-initial-focus
            disabled={state.status === 'spinning'}
            size="lg"
            onClick={spin}
          >
            {state.status === 'ready' ? t('openCase') : t('opening')}
          </Button>
        )}
        {shareSnapshot && (
          <ShareDialog
            decision={shareSnapshot.decision}
            result={shareSnapshot.result}
            share={share}
            onClose={closeShareDialog}
            onShared={setShare}
          />
        )}
      </div>
    </dialog>
  );
}
