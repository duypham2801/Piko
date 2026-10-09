import { useMemo, type ReactNode } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router';

import { t } from '../../i18n';
import DecisionLoadState from '../decisions/DecisionLoadState';
import { useDecisionRecord } from '../decisions/useDecisionRecord';
import { findPreset } from '../presets/presets';
import DecisionForm from './DecisionForm';
import { draftFromPreset, draftOf, emptyDraft } from './draft';

export default function DecisionBuilderPage() {
  const location = useLocation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = location.pathname === '/decisions/new';
  const recordState = useDecisionRecord(isNew ? undefined : id);
  const preset = findPreset(searchParams.get('from') ?? undefined);
  const newInitial = useMemo(() => (preset ? draftFromPreset(preset) : emptyDraft()), [preset]);
  const pageTitle = isNew ? t('builderNewTitle') : t('builderEditTitle');
  let pageContent: ReactNode;

  if (isNew) {
    pageContent = (
      <DecisionForm
        backTo={preset ? `/presets/${preset.slug}` : '/'}
        initial={newInitial}
        key={preset ? `new:${preset.slug}` : 'new'}
      />
    );
  } else if (recordState.status === 'loaded') {
    pageContent = <DecisionForm decisionId={id} initial={draftOf(recordState.record)} key={id} />;
  } else {
    pageContent = <DecisionLoadState state={recordState} />;
  }

  return (
    <>
      <title>{`${pageTitle} · ${t('title')}`}</title>
      {pageContent}
    </>
  );
}
