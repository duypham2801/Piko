import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router';

import NotFoundPage from '../../app/NotFoundPage';
import CaseOpening from '../case-opening/CaseOpening';
import { t } from '../../i18n';
import { applyOff, findPreset, formatOff, parseOff } from './presets';

export default function PresetCasePage() {
  const { slug } = useParams();
  const preset = findPreset(slug);
  const [searchParams] = useSearchParams();
  const optionCount = preset?.decision.options.length ?? 0;
  const off = parseOff(searchParams.get('off'), optionCount);
  const formattedOff = formatOff(off);
  const options = useMemo(() => {
    if (!preset) {
      return [];
    }

    const memoOff = parseOff(formattedOff || null, preset.decision.options.length);
    return applyOff(preset.decision.options, memoOff);
  }, [formattedOff, preset]);

  if (!preset) {
    return <NotFoundPage />;
  }

  const search = searchParams.toString();
  const previewPath = `/presets/${slug}${search ? `?${search}` : ''}`;

  return (
    <>
      <title>{`${preset.decision.title} · ${t('title')}`}</title>
      <CaseOpening
        backTo={previewPath}
        key={`${slug}?${formattedOff}`}
        options={options}
        title={preset.decision.title}
      />
    </>
  );
}
