import { useParams } from 'react-router';

import NotFoundPage from '../../app/NotFoundPage';
import CaseOpening from '../case-opening/CaseOpening';
import { t } from '../../i18n';
import { findPreset } from './presets';

export default function PresetCasePage() {
  const { slug } = useParams();
  const preset = findPreset(slug);

  if (!preset) {
    return <NotFoundPage />;
  }

  return (
    <>
      <title>{`${preset.decision.title} · ${t('title')}`}</title>
      <CaseOpening
        backTo="/"
        key={preset.slug}
        options={preset.decision.options}
        title={preset.decision.title}
      />
    </>
  );
}
