import { useParams, useSearchParams } from 'react-router';

import NotFoundPage from '../../app/NotFoundPage';
import CaseOpening from '../case-opening/CaseOpening';
import { t } from '../../i18n';
import { applyOff, findPreset, formatOff, parseOff } from './presets';

export default function PresetCasePage() {
  const { slug } = useParams();
  const preset = findPreset(slug);
  const [searchParams] = useSearchParams();

  if (!preset) {
    return <NotFoundPage />;
  }

  const off = parseOff(searchParams.get('off'), preset.decision.options.length);
  const search = searchParams.toString();
  const previewPath = `/presets/${slug}${search ? `?${search}` : ''}`;

  return (
    <>
      <title>{`${preset.decision.title} · ${t('title')}`}</title>
      <CaseOpening
        backTo={previewPath}
        key={`${slug}?${formatOff(off)}`}
        options={applyOff(preset.decision.options, off)}
        title={preset.decision.title}
      />
    </>
  );
}
