import { useOutletContext, useParams } from 'react-router';
import type { DecisionRecordData } from '@piko/domain';

import CaseOpening from '../case-opening/CaseOpening';
import { useOffOptions } from '../preview/useOffOptions';

export default function DecisionCasePage() {
  const { id } = useParams();
  const record = useOutletContext<DecisionRecordData>();
  const { options, offKey, search } = useOffOptions(record.decision.options);

  if (!id) return null;

  return (
    <CaseOpening
      backTo={`/decisions/${id}${search}`}
      key={`${id}?${offKey}`}
      options={options}
      source={{ kind: 'decision', decisionId: id }}
      title={record.decision.title}
      category={record.decision.category}
    />
  );
}
