import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { DecisionOptionData } from '@piko/domain';

import { applyOff, formatOff, parseOff } from './off';

export function useOffOptions(options: readonly DecisionOptionData[]) {
  const [searchParams] = useSearchParams();
  const off = parseOff(searchParams.get('off'), options.length);
  const offKey = formatOff(off);
  const searchValue = searchParams.toString();
  const mappedOptions = useMemo(
    () => applyOff(options, parseOff(offKey || null, options.length)),
    [offKey, options],
  );

  return {
    offKey,
    options: mappedOptions,
    search: searchValue ? `?${searchValue}` : '',
  };
}
