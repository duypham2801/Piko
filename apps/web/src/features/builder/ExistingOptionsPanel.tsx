import { useMemo, type KeyboardEvent } from 'react';
import { DECISION_LIMITS } from '@piko/domain';
import type { DecisionDraftData, DecisionOptionData } from '@piko/domain';

import Button from '../../components/ui/Button';
import Chip from '../../components/ui/Chip';
import { t } from '../../i18n';
import { useDecisionList } from '../decisions/useDecisionList';
import { PRESETS } from '../presets/presets';
import { normalizeLabel, withCopiedOption } from './draft';
import styles from './ExistingOptionsPanel.module.css';

export const existingOptionsPanelId = 'existing-options-panel';
export const existingOptionsToggleId = 'existing-options-toggle';

type ExistingOptionsPanelProps = {
  decisionId?: string;
  draft: DecisionDraftData;
  onClose: () => void;
  onEditDraft: (update: (current: DecisionDraftData) => DecisionDraftData) => void;
};

type OptionGroupProps = {
  emoji?: string;
  options: readonly DecisionOptionData[];
  selectedLabels: ReadonlySet<string>;
  title: string;
  atMax: boolean;
  onAdd: (option: DecisionOptionData) => void;
};

function OptionGroup({ emoji, options, selectedLabels, title, atMax, onAdd }: OptionGroupProps) {
  return (
    <details className={styles.group}>
      <summary className={styles.summary}>
        {emoji && (
          <span aria-hidden="true" className={styles.groupEmoji}>
            {emoji}
          </span>
        )}
        <span className={styles.groupTitle}>{title}</span>
      </summary>
      <div className={styles.chips}>
        {options.map((option) => {
          const selected = selectedLabels.has(normalizeLabel(option.label));

          return (
            <Chip
              className={styles.chip}
              disabled={selected || atMax}
              key={option.id}
              selected={selected}
              onSelectedChange={() => onAdd(option)}
            >
              {option.emoji && <span aria-hidden="true">{option.emoji}</span>}
              <span>{option.label}</span>
            </Chip>
          );
        })}
      </div>
    </details>
  );
}

export default function ExistingOptionsPanel({
  decisionId,
  draft,
  onClose,
  onEditDraft,
}: ExistingOptionsPanelProps) {
  const { decisions, status } = useDecisionList();
  const selectedLabels = useMemo(
    () => new Set(draft.options.map((option) => normalizeLabel(option.label)).filter(Boolean)),
    [draft.options],
  );
  const atMax = draft.options.length >= DECISION_LIMITS.maxOptions;
  const savedDecisions = decisions.filter((record) => record.decision.id !== decisionId);
  const showSavedDecisions = status !== 'loaded' || savedDecisions.length > 0;

  const addOption = (option: DecisionOptionData) => {
    onEditDraft((current) => withCopiedOption(current, option));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      aria-label={t('addFromExisting')}
      className={styles.panel}
      id={existingOptionsPanelId}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.headingRow}>
        <h3>{t('addFromExisting')}</h3>
        <Button variant="outline" onClick={onClose}>
          {t('done')}
        </Button>
      </div>
      {atMax && <p className={styles.hint}>{t('maxOptionsHint')}</p>}

      {showSavedDecisions && (
        <section className={styles.section}>
          <h4>{t('yourDecisions')}</h4>
          {status === 'loading' && <p className={styles.muted}>{t('loading')}</p>}
          {status === 'error' && <p className={styles.muted}>{t('listFailed')}</p>}
          {status === 'loaded' && (
            <div className={styles.groups}>
              {savedDecisions.map((record) => (
                <OptionGroup
                  key={record.decision.id}
                  options={record.decision.options}
                  selectedLabels={selectedLabels}
                  title={record.decision.title}
                  atMax={atMax}
                  onAdd={addOption}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className={styles.section}>
        <h4>{t('quickPicks')}</h4>
        <div className={styles.groups}>
          {PRESETS.map((preset) => (
            <OptionGroup
              key={preset.slug}
              emoji={preset.emoji}
              options={preset.decision.options}
              selectedLabels={selectedLabels}
              title={preset.decision.title}
              atMax={atMax}
              onAdd={addOption}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
