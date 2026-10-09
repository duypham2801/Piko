import { useParams } from 'react-router';

import CaseOpening from '../case-opening/CaseOpening';
import { useOffOptions } from '../preview/useOffOptions';
import { findPreset } from './presets';

export default function PresetCasePage() {
  const { slug } = useParams();
  const preset = findPreset(slug);
  const { options, offKey, search } = useOffOptions(preset?.decision.options ?? []);

  if (!preset) return null;

  const previewPath = `/presets/${slug}${search}`;

  return (
    <CaseOpening
      backTo={previewPath}
      key={`${slug}?${offKey}`}
      options={options}
      source={{ kind: 'preset', slug: preset.slug }}
      title={preset.decision.title}
      category={preset.decision.category}
    />
  );
}
