import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DECISION_LIMITS } from '@piko/domain';
import type { DecisionOptionData } from '@piko/domain';

import BackLink from '../../components/ui/BackLink';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Switch from '../../components/ui/Switch';
import { t } from '../../i18n';
import { formatOff, parseOff } from './off';
import styles from './DecisionPreview.module.css';

export type DecisionPreviewProps = {
  title: string;
  emoji?: string;
  options: readonly DecisionOptionData[];
  backTo: string;
  openTo: string;
  openState?: unknown;
  children?: ReactNode;
};

export default function DecisionPreview({
  title,
  emoji,
  options,
  backTo,
  openTo,
  openState,
  children,
}: DecisionPreviewProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
    navigate(`${openTo}${search ? `?${search}` : ''}`, { state: openState });
  };

  return (
    <main className={styles.screen}>
      <div className={styles.content}>
        <BackLink to={backTo}>{t('back')}</BackLink>

        <header className={styles.header}>
          {emoji && (
            <span aria-hidden="true" className={styles.headerEmoji}>
              {emoji}
            </span>
          )}
          <h1>{title}</h1>
          <p>{t('previewLead')}</p>
        </header>

        <ul className={styles.optionList}>
          {options.map((option, index) => {
            const checked = !off.has(index);

            return (
              <li key={option.id}>
                <Card
                  className={styles.optionRow}
                  data-off={!checked ? '' : undefined}
                  tone="surface"
                >
                  <span aria-hidden="true" className={styles.optionEmoji}>
                    {option.emoji}
                  </span>
                  <span className={styles.optionLabel}>{option.label}</span>
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
        {children}
      </div>
    </main>
  );
}
