import { Link } from 'react-router';

import Card from '../../components/ui/Card';
import Screen from '../../app/Screen';
import { t } from '../../i18n';
import { DESKTOP_QUERY, useMediaQuery } from '../../lib/useMediaQuery';
import HistoryList from '../history/HistoryList';
import { useHistoryList } from '../history/useHistoryList';
import ModeSelector from './ModeSelector';
import styles from './HomePage.module.css';
import { useDecisionList } from '../decisions/useDecisionList';
import { PRESETS } from '../presets/presets';

const tones = ['primary', 'secondary', 'accent'] as const;

function CreateDecisionCard() {
  return (
    <Link className={styles.presetLink} to="/decisions/new">
      <Card className={`${styles.presetCard} ${styles.createCard}`} tone="surface">
        <span aria-hidden="true" className={styles.presetEmoji}>
          +
        </span>
        <span className={styles.presetTitle}>{t('builderNewTitle')}</span>
      </Card>
    </Link>
  );
}

function SavedDecisionsSection() {
  const { decisions, status } = useDecisionList();

  return (
    <section className={styles.yourDecisions}>
      <h2>{t('yourDecisions')}</h2>
      <ul className={styles.presetList}>
        <li>
          <CreateDecisionCard />
        </li>
        {status === 'loaded' &&
          decisions.map((record) => {
            const { decision } = record;
            const firstEmoji = decision.options.find((option) => option.emoji)?.emoji;
            const optionHint = decision.options
              .slice(0, 3)
              .map((option) => option.label)
              .join(', ');

            return (
              <li key={decision.id}>
                <Link
                  aria-label={decision.title}
                  className={styles.presetLink}
                  state={{ record }}
                  to={`/decisions/${decision.id}`}
                >
                  <Card className={styles.presetCard} tone="surface">
                    {firstEmoji && (
                      <span aria-hidden="true" className={styles.presetEmoji}>
                        {firstEmoji}
                      </span>
                    )}
                    <span className={styles.presetTitle}>{decision.title}</span>
                    <span className={styles.presetHint}>
                      {optionHint}
                      {decision.options.length > 3 ? '…' : ''}
                    </span>
                  </Card>
                </Link>
              </li>
            );
          })}
      </ul>
      {status === 'error' && <p className={styles.listFailed}>{t('listFailed')}</p>}
    </section>
  );
}

function RecentSection() {
  const { entries, status } = useHistoryList(5);
  const now = new Date();

  if (status !== 'error' && (status !== 'loaded' || entries.length === 0)) {
    return null;
  }

  return (
    <section className={styles.recent}>
      <header className={styles.sectionHeader}>
        <h2>{t('recent')}</h2>
        <Link className={styles.seeAll} to="/history">
          {t('seeAll')}
        </Link>
      </header>
      {status === 'error' ? (
        <p className={styles.listFailed}>{t('historyLoadFailed')}</p>
      ) : (
        <HistoryList entries={entries} now={now} />
      )}
    </section>
  );
}

export default function HomePage() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  return (
    <>
      <title>{`${t('title')} — ${t('tagline')}`}</title>
      <Screen width="wide" className={styles.content}>
        <section className={styles.intro}>
          <h1>{t('homeQuestion')}</h1>
          <p>{t('homeLead')}</p>
        </section>

        <ModeSelector />

        {isDesktop ? (
          <ul className={styles.presetList}>
            <li>
              <CreateDecisionCard />
            </li>
          </ul>
        ) : (
          <>
            <SavedDecisionsSection />
            <RecentSection />
          </>
        )}

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
      </Screen>
    </>
  );
}
