import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { HistorySourceInputData } from '@piko/domain';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import OptionGlyph from '../../components/ui/OptionGlyph';
import Toast from '../../components/ui/Toast';
import { t } from '../../i18n';
import { formatHistoryTime } from '../history/historyTime';
import { retryPick, usePick, type Pick } from '../case-opening/pickStore';
import styles from './ResultCard.module.css';

type ResultCardProps = {
  source: HistorySourceInputData;
};

export default function ResultCard({ source }: ResultCardProps) {
  const pick = usePick(source);
  const focusRef = useRef<HTMLDivElement>(null);
  const previousPickRef = useRef<Pick | null>(null);
  const observedSavingRef = useRef(false);
  const [toastVisible, setToastVisible] = useState(false);
  const hideToast = useCallback(() => setToastVisible(false), []);

  useEffect(() => {
    const previousPick = previousPickRef.current;
    if (!pick) {
      previousPickRef.current = null;
      return;
    }

    let frame: number | undefined;
    if (pick.status === 'saving' && pick !== previousPick) {
      observedSavingRef.current = true;
      frame = window.requestAnimationFrame(() => focusRef.current?.focus());
    }

    if (pick.status === 'saved' && previousPick?.status !== 'saved' && observedSavingRef.current) {
      setToastVisible(true);
    }
    if (pick.status === 'saved' && previousPick?.status === 'saving') {
      frame = window.requestAnimationFrame(() => focusRef.current?.focus());
    }
    previousPickRef.current = pick;
    return () => {
      if (frame !== undefined) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [pick]);

  if (!pick) {
    return null;
  }

  return (
    <>
      <div
        aria-labelledby="result-card-heading"
        className={styles.focusTarget}
        ref={focusRef}
        role="region"
        tabIndex={-1}
      >
        <Card className={styles.card} tone="accent">
          <div className={styles.result}>
            <OptionGlyph
              className={styles.emoji}
              emoji={pick.winner.emoji}
              label={pick.winner.label}
            />
            <h2 className={styles.heading} id="result-card-heading">
              {t('resultToday')} {pick.winner.label}
            </h2>
          </div>
          <div className={styles.meta}>
            <time dateTime={pick.pickedAt}>{formatHistoryTime(pick.pickedAt, new Date())}</time>
            <Link to="/history">{t('viewHistory')}</Link>
          </div>
          {pick.status === 'saving' && <p className={styles.saving}>{t('saving')}</p>}
          {pick.status === 'error' && (
            <div className={styles.errorRow}>
              <p>{t('historySaveFailedShort')}</p>
              <Button size="md" variant="outline" onClick={retryPick}>
                {t('retry')}
              </Button>
            </div>
          )}
        </Card>
      </div>
      <div className={styles.toastRegion} role="status">
        {toastVisible && <Toast message={t('historySavedToast')} onDone={hideToast} />}
      </div>
    </>
  );
}
