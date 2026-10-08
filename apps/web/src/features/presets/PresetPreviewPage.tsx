import { useNavigate, useParams, useSearchParams } from 'react-router';
import { DECISION_LIMITS } from '@piko/domain';

import BackLink from '../../components/ui/BackLink';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Switch from '../../components/ui/Switch';
import { t } from '../../i18n';
import NotFoundPage from '../../app/NotFoundPage';
import styles from './PresetPreviewPage.module.css';
import { findPreset, formatOff, parseOff } from './presets';

export default function PresetPreviewPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const preset = findPreset(slug);

  if (!preset) {
    return <NotFoundPage />;
  }

  const options = preset.decision.options;
  const off = parseOff(searchParams.get('off'), options.length);
  const enabledCount = options.length - off.size;
  const minimumReached = enabledCount === DECISION_LIMITS.minEnabledOptions;
  const search = searchParams.toString();

  const updateOption = (index: number, checked: boolean) => {
    if (!checked && enabledCount <= DECISION_LIMITS.minEnabledOptions) {
      return;
    }

    const nextOff = new Set(off);
    if (checked) {
      nextOff.delete(index);
    } else {
      nextOff.add(index);
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    const formattedOff = formatOff(nextOff);
    if (formattedOff) {
      nextSearchParams.set('off', formattedOff);
    } else {
      nextSearchParams.delete('off');
    }
    setSearchParams(nextSearchParams, { replace: true });
  };

  const openCase = () => {
    navigate(`/presets/${preset.slug}/open${search ? `?${search}` : ''}`);
  };

  return (
    <>
      <title>{`${preset.decision.title} · ${t('title')}`}</title>
      <main className={styles.screen}>
        <div className={styles.content}>
          <BackLink to="/">{t('back')}</BackLink>

          <header className={styles.header}>
            <span aria-hidden="true" className={styles.headerEmoji}>
              {preset.emoji}
            </span>
            <h1>{preset.decision.title}</h1>
            <p>{t('previewLead')}</p>
          </header>

          <ul className={styles.optionList}>
            {options.map((option, index) => {
              const checked = !off.has(index);
              const optionClasses = [styles.optionEmoji, !checked && styles.optionOff]
                .filter(Boolean)
                .join(' ');
              const labelClasses = [styles.optionLabel, !checked && styles.optionOff]
                .filter(Boolean)
                .join(' ');

              return (
                <li key={option.id}>
                  <Card className={styles.optionRow} tone="surface">
                    <span aria-hidden="true" className={optionClasses}>
                      {option.emoji}
                    </span>
                    <span className={labelClasses}>{option.label}</span>
                    <Switch
                      checked={checked}
                      disabled={minimumReached && checked}
                      hideLabel
                      label={option.label}
                      onCheckedChange={(nextChecked) => updateOption(index, nextChecked)}
                    />
                  </Card>
                </li>
              );
            })}
          </ul>

          {minimumReached && <p className={styles.hint}>{t('minOptionsHint')}</p>}

          <Button className={styles.openButton} size="lg" onClick={openCase}>
            {t('openCase')}
          </Button>
        </div>
      </main>
    </>
  );
}
