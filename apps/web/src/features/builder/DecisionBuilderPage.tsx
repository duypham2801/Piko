import { useMemo, type ReactNode } from 'react';
import { useLocation, useParams } from 'react-router';

import { t } from '../../i18n';
import DecisionLoadState from '../decisions/DecisionLoadState';
import { useDecisionRecord } from '../decisions/useDecisionRecord';
import DecisionForm from './DecisionForm';
import { draftOf, emptyDraft } from './draft';

export default function DecisionBuilderPage() {
  const location = useLocation();
  const { id } = useParams();
  const isNew = location.pathname === '/decisions/new';
  const recordState = useDecisionRecord(isNew ? undefined : id);
  const newInitial = useMemo(() => emptyDraft(), []);
  const pageTitle = isNew ? t('builderNewTitle') : t('builderEditTitle');
  let pageContent: ReactNode;

  if (isNew) {
    pageContent = <DecisionForm initial={newInitial} key="new" />;
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
