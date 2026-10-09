import type { HistoryEntryData } from '@piko/domain';

import { findPreset } from '../presets/presets';

export function historyEntryHref(entry: HistoryEntryData): string | undefined {
  if (entry.source.kind === 'decision') {
    return entry.source.decisionId ? `/decisions/${entry.source.decisionId}` : undefined;
  }
  if (entry.source.kind === 'preset') {
    return findPreset(entry.source.slug) ? `/presets/${entry.source.slug}` : undefined;
  }
  return undefined;
}
