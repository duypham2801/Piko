import { useState, type CSSProperties } from 'react';

import ComponentsSection from './ComponentsSection';
import styles from './DesignPage.module.css';

type CustomProperties = CSSProperties & { [key: `--${string}`]: string };

const semanticColors = [
  ['--color-bg', 'Background'],
  ['--color-surface', 'Surface'],
  ['--color-text', 'Text'],
  ['--color-text-muted', 'Text muted'],
  ['--color-text-accent', 'Text accent'],
  ['--color-border', 'Border'],
  ['--color-shadow', 'Shadow'],
  ['--color-primary', 'Primary'],
  ['--color-primary-pressed', 'Primary pressed'],
  ['--color-on-primary', 'On primary'],
  ['--color-on-primary-strong', 'On primary strong'],
  ['--color-secondary', 'Secondary'],
  ['--color-on-secondary', 'On secondary'],
  ['--color-accent', 'Accent'],
  ['--color-on-accent', 'On accent'],
  ['--color-focus-ring', 'Focus ring'],
  ['--color-danger', 'Danger'],
  ['--color-success', 'Success'],
  ['--color-disabled-bg', 'Disabled background'],
  ['--color-disabled-text', 'Disabled text'],
  ['--color-selection', 'Selection'],
] as const;

const onColorPairs = [
  {
    token: '--color-on-primary',
    background: '--color-primary',
    ratio: '3.2:1',
    rule: 'Large or bold text only.',
  },
  {
    token: '--color-on-primary-strong',
    background: '--color-primary',
    ratio: '5.6:1',
    rule: 'Any text size on coral.',
  },
  {
    token: '--color-on-secondary',
    background: '--color-secondary',
    ratio: '7.2:1',
    rule: 'Navy text; white on teal is forbidden.',
  },
  {
    token: '--color-on-accent',
    background: '--color-accent',
    ratio: '10.7:1',
    rule: 'Navy text; white on lemon is forbidden.',
  },
] as const;

const rawPalette = [
  '--palette-coral-500',
  '--palette-coral-700',
  '--palette-teal-500',
  '--palette-teal-700',
  '--palette-lemon-400',
  '--palette-cream-50',
  '--palette-navy-900',
  '--palette-slate-600',
  '--palette-slate-200',
  '--palette-white',
  '--palette-red-700',
  '--palette-green-700',
] as const;

const typeScale = [
  ['--text-xs', 'Extra small'],
  ['--text-sm', 'Small'],
  ['--text-md', 'Medium'],
  ['--text-lg', 'Large'],
  ['--text-xl', 'Extra large'],
  ['--text-2xl', '2x large'],
  ['--text-3xl', '3x large'],
  ['--text-display', 'Display'],
] as const;

const spacingTokens = [
  '--space-1',
  '--space-2',
  '--space-3',
  '--space-4',
  '--space-5',
  '--space-6',
  '--space-7',
  '--space-8',
] as const;

const radiusTokens = [
  ['--radius-sm', 'Small'],
  ['--radius-md', 'Medium'],
  ['--radius-lg', 'Large'],
  ['--radius-pill', 'Pill'],
] as const;

const borderTokens = [
  ['--border-width-thin', 'Thin'],
  ['--border-width', 'Chunky'],
] as const;

const shadowTokens = [
  ['--shadow-chunky-sm', 'Chunky small'],
  ['--shadow-chunky', 'Chunky'],
  ['--shadow-chunky-lg', 'Chunky large'],
  ['--shadow-soft', 'Soft overlay'],
] as const;

const motionSamples = [
  ['fast / standard', '--duration-fast', '--ease-standard'],
  ['normal / out', '--duration-normal', '--ease-out'],
  ['slow / spring', '--duration-slow', '--ease-spring'],
] as const;

const allColorTokens = [...semanticColors.map(([token]) => token), ...rawPalette] as const;

function useResolvedValues(tokens: readonly string[]): Record<string, string> {
  const [values] = useState<Record<string, string>>(() => {
    const computed = getComputedStyle(document.documentElement);
    return Object.fromEntries(
      tokens.map((token) => [token, computed.getPropertyValue(token).trim()]),
    );
  });

  return values;
}

function tokenValue(values: Record<string, string>, token: string): string {
  return values[token] || 'Resolving…';
}

export default function DesignPage() {
  const values = useResolvedValues(allColorTokens);
  const [played, setPlayed] = useState<Record<string, number>>({});

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Developer playground · D-022</p>
          <h1>Design tokens</h1>
          <p>
            The visual vocabulary for PIKO. Review this page in the browser before building shared
            UI primitives.
          </p>
        </header>

        <nav className={styles.contents} aria-label="Design sections">
          <a href="#colors">Colors</a>
          <a href="#typography">Typography</a>
          <a href="#spacing">Spacing</a>
          <a href="#surfaces">Radius, borders & shadows</a>
          <a href="#motion">Motion</a>
          <a href="#components">Components</a>
        </nav>

        <section className={styles.section} id="colors">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionIndex}>01</p>
            <div>
              <h2>Colors</h2>
              <p>Semantic colors keep contrast rules visible at the point of use.</p>
            </div>
          </div>

          <div className={styles.colorGrid}>
            {semanticColors.map(([token, label]) => (
              <article className={styles.colorToken} key={token}>
                <span
                  aria-hidden="true"
                  className={styles.swatch}
                  style={{ '--swatch': `var(${token})` } as CustomProperties}
                />
                <div>
                  <code>{token}</code>
                  <p>{label}</p>
                  <small>{tokenValue(values, token)}</small>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.subsection}>
            <h3>On-color pairs</h3>
            <div className={styles.pairGrid}>
              {onColorPairs.map((pair) => (
                <article
                  className={styles.colorPair}
                  key={pair.token}
                  style={
                    {
                      '--pair-background': `var(${pair.background})`,
                      '--pair-foreground': `var(${pair.token})`,
                    } as CustomProperties
                  }
                >
                  <strong>Sample text</strong>
                  <code>{pair.token}</code>
                  <small>
                    {pair.ratio} · {pair.rule}
                  </small>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.subsection}>
            <h3>Raw palette</h3>
            <div className={styles.paletteRow}>
              {rawPalette.map((token) => (
                <div className={styles.paletteToken} key={token}>
                  <span
                    aria-hidden="true"
                    className={styles.paletteSwatch}
                    style={{ '--swatch': `var(${token})` } as CustomProperties}
                  />
                  <code>{token.replace('--palette-', '')}</code>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section} id="typography">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionIndex}>02</p>
            <div>
              <h2>Typography</h2>
              <p>Baloo 2 Variable brings display energy; Be Vietnam Pro keeps body copy clear.</p>
            </div>
          </div>

          <div className={styles.typeScale}>
            {typeScale.map(([token, label]) => (
              <article className={styles.typeScaleItem} key={token}>
                <div className={styles.tokenLabel}>
                  <code>{token}</code>
                  <span>{label}</span>
                </div>
                <p
                  className={`${styles.typeSample} ${styles.displayType}`}
                  style={{ '--sample-size': `var(${token})` } as CustomProperties}
                >
                  Xoay kèo ngay! Bún chả Hà Nội
                </p>
                <p
                  className={`${styles.typeSample} ${styles.bodyType}`}
                  style={{ '--sample-size': `var(${token})` } as CustomProperties}
                >
                  Hôm nay ăn gì đây? Phở bò, bánh xèo hay cơm tấm — để app quyết định nhé.
                </p>
              </article>
            ))}
          </div>

          <div className={styles.fontSamples}>
            <div>
              <h3>Display weights</h3>
              {[
                ['400', 'Regular'],
                ['600', 'Semibold'],
                ['800', 'Display'],
              ].map(([weight, label]) => (
                <p
                  className={`${styles.weightSample} ${styles.displayType}`}
                  key={weight}
                  style={{ '--sample-weight': weight } as CustomProperties}
                >
                  {label} · Xoay kèo ngay!
                </p>
              ))}
            </div>
            <div>
              <h3>Body weights</h3>
              {[
                ['400', 'Regular'],
                ['500', 'Medium'],
                ['700', 'Bold'],
              ].map(([weight, label]) => (
                <p
                  className={`${styles.weightSample} ${styles.bodyType}`}
                  key={weight}
                  style={{ '--sample-weight': weight } as CustomProperties}
                >
                  {label} · Hôm nay ăn gì đây?
                </p>
              ))}
            </div>
          </div>

          <div className={styles.diacritics}>
            <code>--leading-tight</code>
            <p className={styles.diacriticsSample}>ẤẦẨẪẬ ỐỒỔỖỘ ỨỪỬỮỰ Đđ Ơơ Ưư Ỹỹ</p>
          </div>
        </section>

        <section className={styles.section} id="spacing">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionIndex}>03</p>
            <div>
              <h2>Spacing</h2>
              <p>A 4px base keeps small details and large layouts on the same rhythm.</p>
            </div>
          </div>
          <div className={styles.spacingList}>
            {spacingTokens.map((token) => (
              <div className={styles.spacingItem} key={token}>
                <code>{token}</code>
                <span
                  className={styles.spacingBar}
                  style={{ '--bar-size': `var(${token})` } as CustomProperties}
                />
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} id="surfaces">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionIndex}>04</p>
            <div>
              <h2>Radius, borders & shadows</h2>
              <p>Chunky outlines and offset shadows make surfaces feel tactile, not casino-like.</p>
            </div>
          </div>

          <div className={styles.previewGrid}>
            {radiusTokens.map(([token, label]) => (
              <div
                className={styles.previewBox}
                key={token}
                style={{ '--preview-radius': `var(${token})` } as CustomProperties}
              >
                <code>{token}</code>
                <span>{label}</span>
              </div>
            ))}
            {borderTokens.map(([token, label]) => (
              <div
                className={styles.previewBox}
                key={token}
                style={{ '--preview-border': `var(${token})` } as CustomProperties}
              >
                <code>{token}</code>
                <span>{label} border</span>
              </div>
            ))}
            {shadowTokens.map(([token, label]) => (
              <div
                className={`${styles.previewBox} ${styles.shadowPreview}`}
                key={token}
                style={{ '--preview-shadow': `var(${token})` } as CustomProperties}
              >
                <code>{token}</code>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} id="motion">
          <div className={styles.sectionHeading}>
            <p className={styles.sectionIndex}>05</p>
            <div>
              <h2>Motion</h2>
              <p>
                Press Play to preview the timing tokens. Reduced motion shortens the same tokens.
              </p>
            </div>
          </div>
          <div className={styles.motionList}>
            {motionSamples.map(([label, duration, easing]) => {
              const run = played[label] ?? 0;
              return (
                <article className={styles.motionItem} key={label}>
                  <div className={styles.motionMeta}>
                    <code>{label}</code>
                    <button
                      className={styles.playButton}
                      type="button"
                      onClick={() => setPlayed((current) => ({ ...current, [label]: run + 1 }))}
                    >
                      Play
                    </button>
                  </div>
                  <div className={styles.motionTrack}>
                    {run > 0 && (
                      <span
                        className={styles.motionSquare}
                        key={run}
                        style={
                          {
                            '--motion-duration': `var(${duration})`,
                            '--motion-ease': `var(${easing})`,
                          } as CustomProperties
                        }
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <ComponentsSection />
      </div>
    </main>
  );
}
