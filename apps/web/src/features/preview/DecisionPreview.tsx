import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { DECISION_LIMITS } from '@piko/domain';
import type { DecisionOptionData } from '@piko/domain';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import OptionGlyph from '../../components/ui/OptionGlyph';
import Switch from '../../components/ui/Switch';
import Screen from '../../app/Screen';
import { t } from '../../i18n';
import { formatOff, parseOff } from './off';
import styles from './DecisionPreview.module.css';

export type DecisionPreviewProps = {
  title: string;
  emoji?: string;
  options: readonly DecisionOptionData[];
  backTo: string;
  openTo: string;
  children?: ReactNode;
};

export default function DecisionPreview({
  title,
  emoji,
  options,
  backTo,
  openTo,
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
    navigate(`${openTo}${search ? `?${search}` : ''}`);
  };

  return (
    <Screen backTo={backTo} width="wide">
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
                <OptionGlyph
                  className={styles.optionEmoji}
                  emoji={option.emoji}
                  label={option.label}
                />
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

      <div className={styles.actionBar}>
        {minimumReached && <p className={styles.hint}>{t('minOptionsHint')}</p>}
        <Button className={styles.openButton} size="lg" onClick={openCase}>
          {t('openCase')}
        </Button>
      </div>
      {children}
    </Screen>
  );
}
