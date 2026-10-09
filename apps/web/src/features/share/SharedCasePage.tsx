import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import type { SharedCaseData } from '@piko/domain';

import NotFoundPage from '../../app/NotFoundPage';
import Screen from '../../app/Screen';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { t } from '../../i18n';
import CaseCarousel from '../case-opening/CaseCarousel';
import Confetti from '../case-opening/Confetti';
import WinnerPanel from '../case-opening/WinnerPanel';
import { useCaseOpening } from '../case-opening/useCaseOpening';
import { formatHistoryTime } from '../history/historyTime';
import styles from './SharedCasePage.module.css';
import { usePublicShare } from './usePublicShare';

type RevealLabel = 'winner' | 'try';

function LoadingPage() {
  return (
    <Screen align="center" className={styles.content}>
      <p className={styles.muted}>{t('loading')}</p>
    </Screen>
  );
}

function ErrorPage({ onRetry }: { onRetry: () => void }) {
  return (
    <Screen align="center" className={styles.content}>
      <p className={styles.error}>{t('shareLoadFailed')}</p>
      <Button onClick={onRetry}>{t('retry')}</Button>
    </Screen>
  );
}

function SharedCaseContent({ share }: { share: SharedCaseData }) {
  const [revealLabel, setRevealLabel] = useState<RevealLabel>('winner');
  const { state, plan, open, viewportRef, stripRef } = useCaseOpening(share.options);
  const optionsById = useMemo(
    () => new Map(share.options.map((option) => [option.id, option] as const)),
    [share.options],
  );
  const revealed = state.status === 'revealed';
  const winner = revealed ? optionsById.get(state.result.winnerId) : undefined;
  const spinning = state.status === 'spinning';
  const now = new Date();
  const latestResult = share.result;
  const latestWinner = latestResult
    ? share.options.find((option) => option.id === latestResult.winnerId)
    : undefined;

  const replay = () => {
    if (!share.result) {
      return;
    }

    setRevealLabel('winner');
    open(share.options, share.result.seed);
  };

  const trySpin = () => {
    setRevealLabel('try');
    open();
  };

  return (
    <Screen className={styles.content} width="wide">
      <p className={styles.brand}>{t('title')}</p>
      <h1>{share.title}</h1>

      <p className={styles.latestResult}>
        {latestResult && latestWinner && share.spunAt ? (
          <>
            <span>{t('sharedLatestResult')}</span>{' '}
            <span>
              <span aria-hidden="true">{latestWinner.emoji}</span> {latestWinner.label}
            </span>
            {' · '}
            <time dateTime={share.spunAt}>{formatHistoryTime(share.spunAt, now)}</time>
          </>
        ) : (
          t('notSpunYet')
        )}
      </p>

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
          <WinnerPanel
            label={revealLabel === 'winner' ? t('winnerIs') : t('tryResult')}
            option={winner}
          />
        )}
      </div>

      <div className={styles.actions}>
        {share.result && (
          <Button disabled={spinning} fullWidth size="lg" onClick={replay}>
            {t('replaySpin')}
          </Button>
        )}
        <Button
          disabled={spinning}
          fullWidth
          size={share.result ? 'md' : 'lg'}
          variant={share.result ? 'outline' : 'primary'}
          onClick={trySpin}
        >
          {t('trySpin')}
        </Button>
      </div>

      <section className={styles.optionsSection}>
        <h2>{t('optionsHeading')}</h2>
        <Card className={styles.listCard} tone="surface">
          <ul className={styles.optionList}>
            {share.options
              .filter((option) => option.enabled)
              .map((option) => (
                <li className={styles.option} key={option.id}>
                  {option.emoji && (
                    <span aria-hidden="true" className={styles.optionEmoji}>
                      {option.emoji}
                    </span>
                  )}
                  <span className={styles.optionLabel}>{option.label}</span>
                </li>
              ))}
          </ul>
        </Card>
      </section>

      <Link className={styles.makeYourOwn} to="/">
        {t('makeYourOwn')}
      </Link>
    </Screen>
  );
}

export default function SharedCasePage() {
  const { id } = useParams();
  const state = usePublicShare(id);
  const pageTitle = state.status === 'loaded' ? `${state.share.title} · ${t('title')}` : t('title');

  return (
    <>
      <title>{pageTitle}</title>
      <meta content="noindex" name="robots" />
      {state.status === 'loading' && <LoadingPage />}
      {state.status === 'notFound' && (
        <NotFoundPage message={t('shareUnavailableLead')} title={t('shareUnavailableTitle')} />
      )}
      {state.status === 'error' && <ErrorPage onRetry={state.retry} />}
      {state.status === 'loaded' && <SharedCaseContent share={state.share} />}
    </>
  );
}
