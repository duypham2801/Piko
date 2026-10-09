import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { DECISION_LIMITS, DecisionDraft } from '@piko/domain';
import type { DecisionDraftData } from '@piko/domain';

import Button from '../../components/ui/Button';
import TextField from '../../components/ui/TextField';
import Screen from '../../app/Screen';
import { t } from '../../i18n';
import { ApiClientError } from '../../lib/api/client';
import { createDecision, updateDecision } from '../../lib/api/decisions';
import CaseOpening from '../case-opening/CaseOpening';
import { draftOf, emptyOption, optionInputId } from './draft';
import ExistingOptionsPanel, { existingOptionsToggleId } from './ExistingOptionsPanel';
import { getFormErrors, type FormErrors } from './formErrors';
import OptionRow from './OptionRow';
import styles from './DecisionForm.module.css';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'limitError' | 'saveError';

type DecisionFormProps = {
  backTo?: string;
  decisionId?: string;
  initial: DecisionDraftData;
};

const emptyErrors: FormErrors = { options: {} };

export default function DecisionForm({ backTo, decisionId, initial }: DecisionFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<DecisionDraftData>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [openEmojiId, setOpenEmojiId] = useState<string | null>(null);
  const [existingOpen, setExistingOpen] = useState(false);
  const pendingFocusId = useRef<string | null>(null);
  const isCaseView = searchParams.get('view') === 'case';
  const caseBackSearchParams = new URLSearchParams(searchParams);
  caseBackSearchParams.delete('view');
  const caseBackTo = `${location.pathname}${
    caseBackSearchParams.toString() ? `?${caseBackSearchParams.toString()}` : ''
  }`;
  const parsed = useMemo(() => DecisionDraft.safeParse(draft), [draft]);
  const caseOptions = useMemo(() => (parsed.success ? parsed.data.options : []), [parsed]);
  const errors = useMemo(() => {
    if (!submitted || parsed.success) {
      return emptyErrors;
    }

    return getFormErrors(parsed.error.issues, draft);
  }, [draft, parsed, submitted]);

  useEffect(() => {
    if (!isCaseView || parsed.success) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('view');
    setSearchParams(nextSearchParams, { replace: true });
  }, [isCaseView, parsed.success, searchParams, setSearchParams]);

  useEffect(() => {
    const optionId = pendingFocusId.current;
    if (!optionId) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      pendingFocusId.current = null;
      document.getElementById(optionInputId(optionId))?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [draft.options.length]);

  const editDraft = (update: (current: DecisionDraftData) => DecisionDraftData) => {
    setDraft(update);
    setStatus((current) =>
      current === 'saved' || current === 'limitError' || current === 'saveError' ? 'idle' : current,
    );
  };

  const closeExisting = () => {
    setExistingOpen(false);
    document.getElementById(existingOptionsToggleId)?.focus();
  };

  const focusFirstInvalid = (nextErrors: FormErrors) => {
    if (nextErrors.title) {
      document.getElementById('decision-title')?.focus();
      return;
    }

    for (const option of draft.options) {
      if (nextErrors.options[option.id]) {
        document.getElementById(optionInputId(option.id))?.focus();
        return;
      }
    }
  };

  const validateDraft = () => {
    setSubmitted(true);
    if (!parsed.success) {
      const nextErrors = getFormErrors(parsed.error.issues, draft);
      focusFirstInvalid(nextErrors);
      return null;
    }

    return parsed.data;
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validDraft = validateDraft();
    if (!validDraft) {
      return;
    }

    setStatus('saving');
    try {
      const record = decisionId
        ? await updateDecision(decisionId, validDraft)
        : await createDecision(validDraft);

      const destination = decisionId
        ? `/decisions/${record.decision.id}/edit${location.search}`
        : `/decisions/${record.decision.id}`;
      navigate(destination, {
        replace: true,
        state: { record },
      });

      if (!decisionId) {
        return;
      }

      setDraft(draftOf(record));
      setOpenEmojiId(null);
      setStatus('saved');
    } catch (error: unknown) {
      setStatus(
        error instanceof ApiClientError && error.code === 'decision_limit_reached'
          ? 'limitError'
          : 'saveError',
      );
    }
  };

  const handleOpenCase = () => {
    const validDraft = validateDraft();
    if (!validDraft) {
      return;
    }

    setStatus('idle');
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('view', 'case');
    setSearchParams(nextSearchParams);
  };

  const updateOption = (
    optionId: string,
    update: (option: DecisionDraftData['options'][number]) => DecisionDraftData['options'][number],
  ) => {
    editDraft((current) => ({
      ...current,
      options: current.options.map((option) => (option.id === optionId ? update(option) : option)),
    }));
  };

  const addOption = () => {
    if (draft.options.length >= DECISION_LIMITS.maxOptions) {
      return;
    }

    const option = emptyOption();
    pendingFocusId.current = option.id;
    editDraft((current) => ({ ...current, options: [...current.options, option] }));
  };

  const removeOption = (index: number) => {
    if (draft.options.length <= DECISION_LIMITS.minOptions) {
      return;
    }

    const optionToFocus = draft.options[index + 1] ?? draft.options[index - 1];
    pendingFocusId.current = optionToFocus?.id ?? null;
    editDraft((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
    }));
    setOpenEmojiId(null);
  };

  const statusMessage =
    status === 'saving'
      ? t('saving')
      : status === 'limitError'
        ? t('saveLimit')
        : status === 'saveError'
          ? t('saveFailed')
          : submitted && !parsed.success
            ? t('formInvalid')
            : status === 'saved'
              ? t('saved')
              : '';
  const statusIsError =
    status === 'limitError' || status === 'saveError' || (submitted && !parsed.success);

  if (isCaseView && parsed.success) {
    return (
      <CaseOpening
        backTo={caseBackTo}
        category={parsed.data.category}
        options={caseOptions}
        source={{ kind: 'draft' }}
        title={parsed.data.title}
      />
    );
  }

  return (
    <Screen backTo={backTo ?? (decisionId ? `/decisions/${decisionId}` : '/')}>
      <form className={styles.form} onSubmit={handleSave}>
        <h1>{decisionId ? t('builderEditTitle') : t('builderNewTitle')}</h1>

        <TextField
          error={errors.title}
          id="decision-title"
          label={t('decisionTitleLabel')}
          maxLength={DECISION_LIMITS.titleMaxLength}
          placeholder={t('decisionTitlePlaceholder')}
          value={draft.title}
          onChange={(event) => editDraft((current) => ({ ...current, title: event.target.value }))}
        />

        <section className={styles.optionsSection}>
          <h2>{t('optionsHeading')}</h2>
          <ul className={styles.optionList}>
            {draft.options.map((option, index) => (
              <li key={option.id}>
                <OptionRow
                  error={errors.options[option.id]}
                  index={index}
                  open={openEmojiId === option.id}
                  option={option}
                  optionCount={draft.options.length}
                  onCloseEmoji={() => setOpenEmojiId(null)}
                  onRemove={() => removeOption(index)}
                  onToggleEmoji={() => {
                    setOpenEmojiId((current) => (current === option.id ? null : option.id));
                  }}
                  onUpdate={(update) => updateOption(option.id, update)}
                />
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.optionActions}>
          <Button
            disabled={draft.options.length >= DECISION_LIMITS.maxOptions}
            variant="outline"
            onClick={addOption}
          >
            {t('addOption')}
          </Button>
          <Button
            aria-haspopup="dialog"
            id={existingOptionsToggleId}
            variant="outline"
            onClick={() => {
              setOpenEmojiId(null);
              setExistingOpen((current) => !current);
            }}
          >
            {t('addFromExisting')}
          </Button>
        </div>
        {draft.options.length >= DECISION_LIMITS.maxOptions && (
          <p className={styles.hint}>{t('maxOptionsHint')}</p>
        )}
        {existingOpen && (
          <ExistingOptionsPanel
            decisionId={decisionId}
            draft={draft}
            onClose={closeExisting}
            onEditDraft={editDraft}
          />
        )}

        <div className={styles.actionBar}>
          <p
            aria-live={statusIsError ? 'assertive' : 'polite'}
            className={`${styles.status} ${statusIsError ? styles.statusError : ''}`}
            role={statusIsError ? 'alert' : 'status'}
          >
            {statusMessage}
          </p>
          <div className={styles.actionButtons}>
            <Button fullWidth variant="secondary" type="button" onClick={handleOpenCase}>
              {t('openCase')}
            </Button>
            <Button fullWidth disabled={status === 'saving'} type="submit">
              {status === 'saving' ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </form>
    </Screen>
  );
}
