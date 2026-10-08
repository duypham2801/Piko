import { Link } from 'react-router';

import Card from '../../components/ui/Card';
import { t } from '../../i18n';
import ModeSelector from './ModeSelector';
import styles from './HomePage.module.css';
import { PRESETS } from '../presets/presets';

const tones = ['primary', 'secondary', 'accent', 'primary'] as const;

export default function HomePage() {
  return (
    <>
      <title>{`${t('title')} — ${t('tagline')}`}</title>
      <main className={styles.screen}>
        <div className={styles.content}>
          <header className={styles.brand}>
            <p className={styles.wordmark}>{t('title')}</p>
            <p className={styles.tagline}>{t('tagline')}</p>
          </header>

          <section className={styles.intro}>
            <h1>{t('homeQuestion')}</h1>
            <p>{t('homeLead')}</p>
          </section>

          <ModeSelector />

          <section className={styles.quickPicks}>
            <h2>{t('quickPicks')}</h2>
            <ul className={styles.presetList}>
              {PRESETS.map((preset, index) => (
                <li key={preset.slug}>
                  <Link
                    aria-label={preset.decision.title}
                    className={styles.presetLink}
                    to={`/presets/${preset.slug}`}
                  >
                    <Card className={styles.presetCard} tone={tones[index % tones.length]}>
                      <span aria-hidden="true" className={styles.presetEmoji}>
                        {preset.emoji}
                      </span>
                      <span className={styles.presetTitle}>{preset.decision.title}</span>
                      <span className={styles.presetHint}>
                        {preset.decision.options
                          .slice(0, 3)
                          .map((option) => option.label)
                          .join(', ')}
                        …
                      </span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
