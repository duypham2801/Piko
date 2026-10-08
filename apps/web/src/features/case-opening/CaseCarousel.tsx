import type { RefObject } from 'react';
import type { AnimationPlan, DecisionOptionData } from '@piko/domain';

import CaseItem from './CaseItem';
import styles from './CaseCarousel.module.css';

type CaseCarouselProps = {
  plan: AnimationPlan;
  optionsById: ReadonlyMap<string, DecisionOptionData>;
  revealed: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  stripRef: RefObject<HTMLDivElement | null>;
};

export default function CaseCarousel({
  plan,
  optionsById,
  revealed,
  viewportRef,
  stripRef,
}: CaseCarouselProps) {
  return (
    <div aria-hidden="true" className={styles.viewport} ref={viewportRef}>
      <div className={styles.strip} ref={stripRef}>
        {plan.strip.map((id, index) => {
          const option = optionsById.get(id);
          if (!option) {
            return null;
          }

          return (
            <CaseItem
              isWinner={index === plan.winnerIndex}
              key={`${id}-${index}`}
              option={option}
              revealed={revealed}
            />
          );
        })}
      </div>
      <span className={styles.marker} />
    </div>
  );
}
