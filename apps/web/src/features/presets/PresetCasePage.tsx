import { useParams } from 'react-router';

import NotFoundPage from '../../app/NotFoundPage';
import CaseOpening from '../case-opening/CaseOpening';
import { t } from '../../i18n';
import { useOffOptions } from '../preview/useOffOptions';
import { findPreset } from './presets';

export default function PresetCasePage() {
  const { slug } = useParams();
  const preset = findPreset(slug);
  const { options, offKey, search } = useOffOptions(preset?.decision.options ?? []);

  if (!preset) {
    return <NotFoundPage />;
  }

  const previewPath = `/presets/${slug}${search}`;

  return (
    <>
      <title>{`${preset.decision.title} · ${t('title')}`}</title>
      <CaseOpening
        backTo={previewPath}
        key={`${slug}?${offKey}`}
        options={options}
        title={preset.decision.title}
      />
    </>
  );
}
