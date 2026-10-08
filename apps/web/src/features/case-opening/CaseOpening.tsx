import { useMemo } from 'react';
import type { DecisionOptionData } from '@piko/domain';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { t } from '../../i18n';
import CaseCarousel from './CaseCarousel';
import styles from './CaseOpening.module.css';
import Confetti from './Confetti';
import { useCaseOpening } from './useCaseOpening';

type CaseOpeningProps = {
  options: readonly DecisionOptionData[];
};

export default function CaseOpening({ options }: CaseOpeningProps) {
  const { state, plan, open, viewportRef, stripRef } = useCaseOpening(options);
  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option] as const)),
    [options],
  );
  const revealed = state.status === 'revealed';
  const winner = revealed ? optionsById.get(state.result.winnerId) : undefined;

  return (
    <main className={styles.screen}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1>{t('title')}</h1>
          <p>{t('tagline')}</p>
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

        <Button disabled={state.status === 'spinning'} size="lg" onClick={open}>
          {state.status === 'ready'
            ? t('openCase')
            : state.status === 'spinning'
              ? t('opening')
              : t('spinAgain')}
        </Button>
      </div>
    </main>
  );
}
