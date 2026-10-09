import { Link, useParams } from 'react-router';

import NotFoundPage from '../../app/NotFoundPage';
import DecisionPreview from '../preview/DecisionPreview';
import { findPreset } from './presets';
import { t } from '../../i18n';
import styles from './PresetPreviewPage.module.css';

export default function PresetPreviewPage() {
  const { slug } = useParams();
  const preset = findPreset(slug);

  if (!preset) {
    return <NotFoundPage />;
  }

  return (
    <>
      <title>{`${preset.decision.title} · ${t('title')}`}</title>
      <DecisionPreview
        backTo="/"
        emoji={preset.emoji}
        openTo={`/presets/${preset.slug}/open`}
        options={preset.decision.options}
        title={preset.decision.title}
      >
        <Link className={styles.customize} to={`/decisions/new?from=${preset.slug}`}>
          {t('customize')}
        </Link>
      </DecisionPreview>
    </>
  );
}
