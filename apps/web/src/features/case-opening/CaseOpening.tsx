import { useMemo } from 'react';
import { buildAnimationPlan, select, type DecisionOptionData } from '@piko/domain';

import Button from '../../components/ui/Button';
import { t } from '../../i18n';
import CaseCarousel from './CaseCarousel';
import styles from './CaseOpening.module.css';
import { CASE_PREVIEW_SEED, useCaseOpening } from './useCaseOpening';

type CaseOpeningProps = {
  options: readonly DecisionOptionData[];
};

export default function CaseOpening({ options }: CaseOpeningProps) {
  const { state, open, viewportRef, stripRef } = useCaseOpening(options);
  const previewPlan = useMemo(
    () => buildAnimationPlan(select(options, CASE_PREVIEW_SEED), options),
    [options],
  );
  const optionsById = useMemo(
    () => new Map(options.map((option) => [option.id, option] as const)),
    [options],
  );
  const plan = state.status === 'ready' ? previewPlan : state.plan;
  const revealed = state.status === 'revealed';
  const winner = revealed ? optionsById.get(state.result.winnerId) : undefined;

  return (
    <main className={styles.screen}>
      <div className={styles.content}>
        <header className={styles.header}>
          <h1>{t('title')}</h1>
          <p>{t('tagline')}</p>
        </header>

        <CaseCarousel
          optionsById={optionsById}
          plan={plan}
          revealed={revealed}
          stripRef={stripRef}
          viewportRef={viewportRef}
        />

        <div aria-live="polite" className={styles.result} role="status">
          {winner && (
            <p>
              {t('winnerIs')} {winner.emoji} {winner.label}
            </p>
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
