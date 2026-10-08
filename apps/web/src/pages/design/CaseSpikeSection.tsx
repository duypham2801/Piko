import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  ANIMATION_PLAN_DEFAULTS,
  buildAnimationPlan,
  positionAt,
  select,
  type AnimationPlan,
  type AnimationPlanParams,
  type DecisionOptionData,
} from '@piko/domain';

import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Chip from '../../components/ui/Chip';
import Switch from '../../components/ui/Switch';
import TextField from '../../components/ui/TextField';

import pageStyles from './DesignPage.module.css';
import styles from './CaseSpikeSection.module.css';

const INITIAL_SEED = 0x13579bdf;
const MILLISECONDS_PER_SECOND = 1_000;
const HINT_SAMPLE_COUNT = 120;

const poolSizes = [2, 5, 8, 20] as const;
type PoolSize = (typeof poolSizes)[number];

const speeds = [1, 0.25] as const;
type Speed = (typeof speeds)[number];

type ParameterKey = keyof AnimationPlanParams;
type ParameterDraft = Record<ParameterKey, string>;
type ParameterErrors = Partial<Record<ParameterKey, boolean>>;

type ParameterConfig = {
  readonly key: ParameterKey;
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly integer?: boolean;
};

const parameterConfig = [
  { key: 'durationMs', label: 'Duration (ms)', min: 1_000, max: 20_000, step: 100, integer: true },
  { key: 'minSpinItems', label: 'Minimum spin items', min: 10, max: 100, step: 1, integer: true },
  { key: 'spinItemsJitter', label: 'Spin items jitter', min: 1, max: 20, step: 1, integer: true },
  { key: 'stopBand', label: 'Stop band', min: 0.1, max: 0.9, step: 0.1 },
  { key: 'accelFraction', label: 'Acceleration fraction', min: 0.01, max: 0.9, step: 0.01 },
  { key: 'decelPower', label: 'Deceleration power', min: 1, max: 8, step: 1, integer: true },
  { key: 'leadingItems', label: 'Leading items', min: 2, max: 20, step: 1, integer: true },
  { key: 'trailingItems', label: 'Trailing items', min: 2, max: 20, step: 1, integer: true },
] satisfies readonly ParameterConfig[];

const demoOptions: readonly DecisionOptionData[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    label: 'Phở bò',
    emoji: '🍜',
    weight: 1,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    label: 'Bún chả',
    emoji: '🥢',
    weight: 2,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    label: 'Bánh xèo',
    emoji: '🥞',
    weight: 3,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    label: 'Cơm tấm',
    emoji: '🍚',
    weight: 4,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    label: 'Lẩu Thái',
    emoji: '🍲',
    weight: 5,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000006',
    label: 'Chè đậu',
    emoji: '🍧',
    weight: 1,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000007',
    label: 'Cà phê',
    emoji: '☕',
    weight: 2,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000008',
    label: 'Trà sữa',
    emoji: '🧋',
    weight: 3,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000009',
    label: 'Đi dạo',
    emoji: '🚶',
    weight: 4,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    label: 'Xem phim',
    emoji: '🎬',
    weight: 5,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000011',
    label: 'Đọc sách',
    emoji: '📚',
    weight: 1,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    label: 'Tập thể dục',
    emoji: '🏃',
    weight: 2,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000013',
    label: 'Nấu ăn',
    emoji: '👩‍🍳',
    weight: 3,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000014',
    label: 'Chơi game',
    emoji: '🎮',
    weight: 4,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000015',
    label: 'Nghe nhạc',
    emoji: '🎧',
    weight: 5,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000016',
    label: 'Vẽ tranh',
    emoji: '🎨',
    weight: 1,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000017',
    label: 'Đi biển',
    emoji: '🏖️',
    weight: 2,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000018',
    label: 'Cắm trại',
    emoji: '⛺',
    weight: 3,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000019',
    label: 'Chụp ảnh',
    emoji: '📸',
    weight: 4,
    enabled: true,
  },
  {
    id: '00000000-0000-4000-8000-000000000020',
    label: 'Học điều mới',
    emoji: '💡',
    weight: 5,
    enabled: true,
  },
];

function createPlan(
  options: readonly DecisionOptionData[],
  seed: number,
  params: AnimationPlanParams,
): AnimationPlan {
  return buildAnimationPlan(select(options, seed), options, params);
}

function createParameterDraft(params: AnimationPlanParams): ParameterDraft {
  return parameterConfig.reduce((draft, { key }) => {
    draft[key] = String(params[key]);
    return draft;
  }, {} as ParameterDraft);
}

function createFreshSeed(): number {
  const values = crypto.getRandomValues(new Uint32Array(1));
  return values[0] ?? INITIAL_SEED;
}

function parseSeed(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 0xffffffff ? parsed : undefined;
}

export default function CaseSpikeSection() {
  const [poolSize, setPoolSize] = useState<PoolSize>(8);
  const [equalWeights, setEqualWeights] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [params, setParams] = useState<AnimationPlanParams>(ANIMATION_PLAN_DEFAULTS);
  const [parameterDraft, setParameterDraft] = useState<ParameterDraft>(() =>
    createParameterDraft(ANIMATION_PLAN_DEFAULTS),
  );
  const [parameterErrors, setParameterErrors] = useState<ParameterErrors>({});
  const [seedDraft, setSeedDraft] = useState('');
  const [seedError, setSeedError] = useState(false);
  const [seedUsed, setSeedUsed] = useState(INITIAL_SEED);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');

  const activePool = useMemo(() => {
    const selected = demoOptions.slice(0, poolSize);
    return equalWeights ? selected.map((option) => ({ ...option, weight: 1 })) : selected;
  }, [equalWeights, poolSize]);
  const initialPlan = useMemo(
    () => createPlan(activePool, INITIAL_SEED, ANIMATION_PLAN_DEFAULTS),
    [activePool],
  );
  const [plan, setPlan] = useState<AnimationPlan>(initialPlan);

  const viewportRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLPreElement>(null);
  const frameRef = useRef<number | null>(null);
  const activePlanRef = useRef(plan);
  const lastSeedRef = useRef(INITIAL_SEED);
  const speedRef = useRef<Speed>(speed);
  const elapsedRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const previousFrameTimeRef = useRef<number | null>(null);
  const layoutRef = useRef({ cellWidth: 0, viewportWidth: 0 });

  const applyPosition = useCallback((position: number) => {
    const { cellWidth, viewportWidth } = layoutRef.current;
    const strip = stripRef.current;
    if (!strip || cellWidth === 0 || viewportWidth === 0) {
      return;
    }

    const translateX = viewportWidth / 2 - position * cellWidth;
    strip.style.transform = `translate3d(${translateX}px, 0, 0)`;
  }, []);

  const writeReadout = useCallback(
    (currentPlan: AnimationPlan, elapsed: number, position: number, currentSpeed: number) => {
      if (!readoutRef.current) {
        return;
      }

      readoutRef.current.textContent =
        `elapsed ${elapsed.toFixed(0)} ms / ${currentPlan.durationMs} ms\n` +
        `position ${position.toFixed(3)}\n` +
        `speed ${currentSpeed.toFixed(2)} cells/s`;
    },
    [],
  );

  const measureLayout = useCallback(() => {
    const viewport = viewportRef.current;
    const firstCell = stripRef.current?.firstElementChild as HTMLElement | null;
    if (!viewport || !firstCell) {
      return;
    }

    layoutRef.current = {
      cellWidth: firstCell.getBoundingClientRect().width,
      viewportWidth: viewport.getBoundingClientRect().width,
    };
    const currentPlan = activePlanRef.current;
    applyPosition(positionAt(currentPlan, elapsedRef.current));
  }, [applyPosition]);

  const cancelAnimation = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    startTimeRef.current = null;
    previousFrameTimeRef.current = null;
  }, []);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(measureLayout);
    observer.observe(viewport);
    measureLayout();
    return () => observer.disconnect();
  }, [measureLayout]);

  useEffect(() => {
    activePlanRef.current = plan;
    if (frameRef.current === null) {
      elapsedRef.current = 0;
      applyPosition(plan.startPosition);
      writeReadout(plan, 0, plan.startPosition, 0);
    }
  }, [applyPosition, plan, writeReadout]);

  useEffect(() => {
    if (frameRef.current !== null) {
      return;
    }

    setPlan(createPlan(activePool, lastSeedRef.current, params));
  }, [activePool, params]);

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  const serializedParams = useMemo(() => JSON.stringify(params, null, 2), [params]);
  const tuningHint = useMemo(() => {
    const samplePlan = createPlan(activePool, INITIAL_SEED, params);
    let previousElapsed = 0;
    let previousPosition = positionAt(samplePlan, 0);
    let peakSpeed = 0;

    for (let sample = 1; sample <= HINT_SAMPLE_COUNT; sample += 1) {
      const elapsed = (samplePlan.durationMs * sample) / HINT_SAMPLE_COUNT;
      const position = positionAt(samplePlan, elapsed);
      const seconds = (elapsed - previousElapsed) / MILLISECONDS_PER_SECOND;
      peakSpeed = Math.max(peakSpeed, (position - previousPosition) / seconds);
      previousElapsed = elapsed;
      previousPosition = position;
    }

    const lastSecondStart = Math.max(0, samplePlan.durationMs - MILLISECONDS_PER_SECOND);
    const lastTwoSecondsStart = Math.max(0, samplePlan.durationMs - 2 * MILLISECONDS_PER_SECOND);
    return {
      peakSpeed,
      lastSecond: samplePlan.stopPosition - positionAt(samplePlan, lastSecondStart),
      lastTwoSeconds: samplePlan.stopPosition - positionAt(samplePlan, lastTwoSecondsStart),
    };
  }, [activePool, params]);

  function startAnimation(seed: number) {
    cancelAnimation();
    const nextPlan = createPlan(activePool, seed, params);
    activePlanRef.current = nextPlan;
    lastSeedRef.current = seed;
    elapsedRef.current = 0;
    setSeedUsed(seed);
    setPlan(nextPlan);
    setHasFinished(false);
    setIsSpinning(true);
    measureLayout();
    applyPosition(nextPlan.startPosition);
    writeReadout(nextPlan, 0, nextPlan.startPosition, 0);

    const startTime = performance.now();
    startTimeRef.current = startTime;
    previousFrameTimeRef.current = startTime;

    const frame = (now: number) => {
      const currentPlan = activePlanRef.current;
      const previousFrameTime = previousFrameTimeRef.current;
      const previousPosition = positionAt(currentPlan, elapsedRef.current);
      const elapsed = Math.min(
        (now - (startTimeRef.current ?? now)) * speedRef.current,
        currentPlan.durationMs,
      );
      const position = positionAt(currentPlan, elapsed);
      const frameSeconds =
        previousFrameTime === null ? 0 : (now - previousFrameTime) / MILLISECONDS_PER_SECOND;
      const currentSpeed =
        frameSeconds > 0 ? Math.max(0, (position - previousPosition) / frameSeconds) : 0;

      elapsedRef.current = elapsed;
      previousFrameTimeRef.current = now;
      applyPosition(position);
      writeReadout(currentPlan, elapsed, position, currentSpeed);

      if (elapsed >= currentPlan.durationMs) {
        frameRef.current = null;
        startTimeRef.current = null;
        previousFrameTimeRef.current = null;
        setIsSpinning(false);
        setHasFinished(true);
        return;
      }

      frameRef.current = requestAnimationFrame(frame);
    };

    frameRef.current = requestAnimationFrame(frame);
  }

  function handlePlay() {
    const typedSeed = parseSeed(seedDraft);
    if (seedDraft.trim() !== '' && typedSeed === undefined) {
      setSeedError(true);
      return;
    }

    setSeedError(false);
    startAnimation(typedSeed ?? createFreshSeed());
  }

  function handleReplay() {
    setSeedError(false);
    startAnimation(lastSeedRef.current);
  }

  function handleParameterChange(
    key: ParameterKey,
    config: ParameterConfig,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const value = event.currentTarget.value;
    const parsed = Number(value);
    const valid =
      value.trim() !== '' &&
      Number.isFinite(parsed) &&
      parsed >= config.min &&
      parsed <= config.max &&
      (!config.integer || Number.isInteger(parsed));

    setParameterDraft((current) => ({ ...current, [key]: value }));
    setParameterErrors((current) => ({ ...current, [key]: !valid }));
    setParams((current) => ({
      ...current,
      [key]: valid ? parsed : ANIMATION_PLAN_DEFAULTS[key],
    }));
    setHasFinished(false);
  }

  function handleReset() {
    setParams(ANIMATION_PLAN_DEFAULTS);
    setParameterDraft(createParameterDraft(ANIMATION_PLAN_DEFAULTS));
    setParameterErrors({});
    setHasFinished(false);
  }

  async function handleCopyParams() {
    try {
      await navigator.clipboard.writeText(serializedParams);
      setCopyStatus('Copied');
    } catch {
      setCopyStatus('Copy unavailable');
    }
  }

  const winner = activePool.find((option) => option.id === plan.strip[plan.winnerIndex]);
  const controlsDisabled = isSpinning;

  return (
    <section className={pageStyles.section} id="case-spike">
      <div className={pageStyles.sectionHeading}>
        <p className={pageStyles.sectionIndex}>07</p>
        <div>
          <h2>Case spike</h2>
          <p>Throwaway tuning playground for the animation plan. Not the Phase 3 component.</p>
        </div>
      </div>

      <div className={styles.layout}>
        <Card className={styles.demoCard}>
          <div className={styles.toolbar}>
            <div className={styles.actions}>
              <Button size="lg" onClick={handlePlay}>
                {isSpinning ? 'Play again' : 'Play'}
              </Button>
              <Button disabled={controlsDisabled} variant="outline" onClick={handleReplay}>
                Replay
              </Button>
            </div>
            <div className={styles.status}>
              <Badge>Seed: {seedUsed}</Badge>
              <Badge tone="neutral">Pool: {poolSize}</Badge>
            </div>
          </div>

          <div aria-label="Case strip preview" className={styles.viewport} ref={viewportRef}>
            <div className={styles.strip} ref={stripRef}>
              {plan.strip.map((id, index) => {
                const option = activePool.find((candidate) => candidate.id === id);
                const isWinner = index === plan.winnerIndex;
                return (
                  <div
                    aria-label={`${option?.emoji ?? ''} ${option?.label ?? id}`}
                    className={`${styles.cell} ${isWinner ? styles.winnerCell : ''}`}
                    key={`${id}-${index}`}
                    title={option?.label ?? id}
                  >
                    <span aria-hidden="true" className={styles.cellEmoji}>
                      {option?.emoji}
                    </span>
                    <span className={styles.cellLabel}>{option?.label ?? id}</span>
                  </div>
                );
              })}
            </div>
            <span aria-hidden="true" className={styles.marker} />
          </div>

          <pre className={styles.readout} ref={readoutRef}>
            elapsed 0 ms / {plan.durationMs} ms{`\n`}position {plan.startPosition.toFixed(3)}
            {`\n`}speed 0.00 cells/s
          </pre>

          {hasFinished && winner && (
            <p className={styles.winnerText}>
              Winner: {winner.emoji} {winner.label} · stop offset {plan.stopOffset.toFixed(3)}
            </p>
          )}
        </Card>

        <div className={styles.controls}>
          <Card className={styles.controlGroup}>
            <h3>Pool</h3>
            <div aria-label="Pool size" className={styles.chipRow} role="group">
              {poolSizes.map((size) => (
                <Chip
                  disabled={controlsDisabled}
                  key={size}
                  selected={poolSize === size}
                  onSelectedChange={() => {
                    setPoolSize(size);
                    setHasFinished(false);
                  }}
                >
                  {size}
                </Chip>
              ))}
            </div>
            <Switch
              checked={equalWeights}
              disabled={controlsDisabled}
              label="Equal weights"
              onCheckedChange={(checked) => {
                setEqualWeights(checked);
                setHasFinished(false);
              }}
            />
          </Card>

          <Card className={styles.controlGroup}>
            <h3>Seed</h3>
            <TextField
              disabled={controlsDisabled}
              error={seedError ? 'Invalid seed' : undefined}
              label="Numeric seed"
              max={0xffffffff}
              min={0}
              step={1}
              type="number"
              value={seedDraft}
              onChange={(event) => {
                setSeedDraft(event.currentTarget.value);
                setSeedError(false);
              }}
            />
            <p className={styles.helper}>
              Leave empty for a fresh seed. Replay uses the last seed.
            </p>
          </Card>

          <Card className={styles.controlGroup}>
            <h3>Speed</h3>
            <div aria-label="Playback speed" className={styles.chipRow} role="group">
              {speeds.map((value) => (
                <Chip
                  disabled={controlsDisabled}
                  key={value}
                  selected={speed === value}
                  onSelectedChange={() => setSpeed(value)}
                >
                  ×{value}
                </Chip>
              ))}
            </div>
          </Card>

          <Card className={styles.controlGroup}>
            <div className={styles.headingRow}>
              <h3>Plan parameters</h3>
              <Button disabled={controlsDisabled} variant="outline" onClick={handleReset}>
                Reset to defaults
              </Button>
            </div>
            <div className={styles.parameterGrid}>
              {parameterConfig.map((config) => (
                <TextField
                  disabled={controlsDisabled}
                  error={parameterErrors[config.key] ? 'Invalid — using default' : undefined}
                  key={config.key}
                  label={config.label}
                  max={config.max}
                  min={config.min}
                  step={config.step}
                  type="number"
                  value={parameterDraft[config.key]}
                  onChange={(event) => handleParameterChange(config.key, config, event)}
                />
              ))}
            </div>
          </Card>

          <Card className={styles.controlGroup}>
            <div className={styles.headingRow}>
              <h3>Params JSON</h3>
              <Button disabled={controlsDisabled} variant="outline" onClick={handleCopyParams}>
                Copy params
              </Button>
            </div>
            <pre className={styles.jsonBlock}>
              <code>{serializedParams}</code>
            </pre>
            {copyStatus && <p className={styles.helper}>{copyStatus}</p>}
            <p className={styles.hint}>
              Peak ≈ {tuningHint.peakSpeed.toFixed(1)} cells/s · last 1 s ≈{' '}
              {tuningHint.lastSecond.toFixed(2)} cells · last 2 s ≈{' '}
              {tuningHint.lastTwoSeconds.toFixed(2)} cells
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}
