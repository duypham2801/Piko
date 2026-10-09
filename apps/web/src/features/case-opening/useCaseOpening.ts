import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import {
  buildAnimationPlan,
  positionAt,
  select,
  type AnimationPlan,
  type DecisionOptionData,
} from '@piko/domain';

import { caseOpeningReducer } from './caseOpeningState';

const MILLISECONDS_PER_SECOND = 1_000;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const CASE_PREVIEW_SEED = 0x2468ace0;

type Layout = {
  cellWidth: number;
  viewportWidth: number;
};

export function useCaseOpening(pool: readonly DecisionOptionData[]) {
  const [state, dispatch] = useReducer(caseOpeningReducer, { status: 'ready' });
  const previewPlan = useMemo(
    () => buildAnimationPlan(select(pool, CASE_PREVIEW_SEED), pool),
    [pool],
  );
  const displayedPlan = state.status === 'ready' ? previewPlan : state.plan;

  const viewportRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const transitionCleanupRef = useRef<(() => void) | null>(null);
  const activePlanRef = useRef<AnimationPlan>(displayedPlan);
  const elapsedRef = useRef(0);
  const layoutRef = useRef<Layout>({ cellWidth: 0, viewportWidth: 0 });
  const reducedMotionRef = useRef(false);
  const reducedMotionActiveRef = useRef(false);
  const revealedRef = useRef(false);

  const writePosition = useCallback((position: number) => {
    const strip = stripRef.current;
    const { cellWidth, viewportWidth } = layoutRef.current;
    if (!strip || cellWidth === 0 || viewportWidth === 0) {
      return;
    }

    const translateX = viewportWidth / 2 - position * cellWidth;
    strip.style.transform = `translate3d(${translateX}px, 0, 0)`;
  }, []);

  const measureLayout = useCallback(() => {
    const viewport = viewportRef.current;
    const firstCell = stripRef.current?.firstElementChild as HTMLElement | null;
    if (!viewport || !firstCell) {
      return false;
    }

    layoutRef.current = {
      cellWidth: firstCell.getBoundingClientRect().width,
      viewportWidth: viewport.getBoundingClientRect().width,
    };
    return true;
  }, []);

  const clearReducedMotion = useCallback(() => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    transitionCleanupRef.current?.();
    transitionCleanupRef.current = null;
    const strip = stripRef.current;
    if (strip) {
      delete strip.dataset.motion;
    }
    reducedMotionActiveRef.current = false;
  }, []);

  const cancelAnimation = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    clearReducedMotion();
  }, [clearReducedMotion]);

  const startReducedMotion = useCallback(
    (plan: AnimationPlan) => {
      const strip = stripRef.current;
      if (!strip) {
        return;
      }

      reducedMotionActiveRef.current = true;
      revealedRef.current = false;
      const approachPosition = plan.stopPosition - 3;
      elapsedRef.current = plan.durationMs;
      writePosition(approachPosition);

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        strip.dataset.motion = 'reduced';

        const finish = () => {
          if (revealedRef.current) {
            return;
          }
          revealedRef.current = true;
          writePosition(plan.stopPosition);
          clearReducedMotion();
          dispatch({ type: 'reveal' });
        };
        const handleTransitionEnd = (event: TransitionEvent) => {
          if (event.target === strip && event.propertyName === 'transform') {
            finish();
          }
        };
        const transitionDurationSeconds = Number.parseFloat(
          window.getComputedStyle(strip).transitionDuration,
        );
        const transitionDurationMs =
          (Number.isFinite(transitionDurationSeconds) ? transitionDurationSeconds : 0) *
          MILLISECONDS_PER_SECOND;

        strip.addEventListener('transitionend', handleTransitionEnd);
        transitionCleanupRef.current = () =>
          strip.removeEventListener('transitionend', handleTransitionEnd);
        transitionTimerRef.current = window.setTimeout(finish, transitionDurationMs);
        writePosition(plan.stopPosition);
      });
    },
    [clearReducedMotion, writePosition],
  );

  const startNormalMotion = useCallback(
    (plan: AnimationPlan) => {
      const startedAt = performance.now();
      elapsedRef.current = 0;
      revealedRef.current = false;

      const frame = (now: number) => {
        const elapsed = Math.min(now - startedAt, plan.durationMs);
        elapsedRef.current = elapsed;
        writePosition(positionAt(plan, elapsed));

        if (!revealedRef.current && elapsed >= plan.revealAtMs) {
          revealedRef.current = true;
          dispatch({ type: 'reveal' });
        }

        if (elapsed >= plan.durationMs) {
          writePosition(plan.stopPosition);
          frameRef.current = null;
          return;
        }

        frameRef.current = requestAnimationFrame(frame);
      };

      frameRef.current = requestAnimationFrame(frame);
    },
    [writePosition],
  );

  useLayoutEffect(() => {
    activePlanRef.current = displayedPlan;
    if (!measureLayout()) {
      return;
    }

    if (state.status === 'ready') {
      elapsedRef.current = 0;
      writePosition(displayedPlan.startPosition);
      return;
    }

    if (state.status === 'spinning') {
      if (reducedMotionRef.current) {
        startReducedMotion(displayedPlan);
      } else {
        startNormalMotion(displayedPlan);
      }
    }
  }, [
    displayedPlan,
    measureLayout,
    startNormalMotion,
    startReducedMotion,
    state.status,
    writePosition,
  ]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!measureLayout()) {
        return;
      }

      const plan = activePlanRef.current;
      const position = reducedMotionActiveRef.current
        ? plan.stopPosition - 3
        : positionAt(plan, elapsedRef.current);
      writePosition(position);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [measureLayout, writePosition]);

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  const open = useCallback(
    (spinOptions: readonly DecisionOptionData[] = pool) => {
      if (state.status === 'spinning') {
        return;
      }

      const values = crypto.getRandomValues(new Uint32Array(1));
      const seed = values[0];
      if (seed === undefined) {
        return;
      }

      cancelAnimation();
      reducedMotionRef.current = window.matchMedia(REDUCED_MOTION_QUERY).matches;
      const result = select(spinOptions, seed);
      const plan = buildAnimationPlan(result, spinOptions);
      dispatch({ type: 'open', plan, result });
    },
    [cancelAnimation, pool, state.status],
  );

  return { state, plan: displayedPlan, open, viewportRef, stripRef };
}
