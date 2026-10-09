import { useParams } from 'react-router';

import NotFoundPage from '../../app/NotFoundPage';
import { t } from '../../i18n';
import CaseOpening from '../case-opening/CaseOpening';
import { useOffOptions } from '../preview/useOffOptions';
import DecisionLoadState from './DecisionLoadState';
import { useDecisionRecord } from './useDecisionRecord';

export default function DecisionCasePage() {
  const { id } = useParams();
  const recordState = useDecisionRecord(id);
  const decisionOptions =
    recordState.status === 'loaded' ? recordState.record.decision.options : [];
  const { options, offKey, search } = useOffOptions(decisionOptions);

  if (recordState.status !== 'loaded') {
    return <DecisionLoadState state={recordState} />;
  }
  if (!id) return <NotFoundPage />;

  const { decision } = recordState.record;
  return (
    <>
      <title>{`${decision.title} · ${t('title')}`}</title>
      <CaseOpening
        backTo={`/decisions/${id}${search}`}
        key={`${id}?${offKey}`}
        options={options}
        source={{ kind: 'decision', decisionId: id }}
        title={decision.title}
        category={decision.category}
      />
    </>
  );
}
