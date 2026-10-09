import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { DECISION_LIMITS, DecisionDraft } from '@piko/domain';
import type { DecisionDraftData, DecisionRecordData } from '@piko/domain';

import BackLink from '../../components/ui/BackLink';
import Button from '../../components/ui/Button';
import TextField from '../../components/ui/TextField';
import { t } from '../../i18n';
import { ApiClientError } from '../../lib/api/client';
import { createDecision, updateDecision } from '../../lib/api/decisions';
import CaseOpening from '../case-opening/CaseOpening';
import { getFormErrors, type FormErrors } from './formErrors';
import OptionRow from './OptionRow';
import styles from './DecisionForm.module.css';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'limitError' | 'saveError';

type DecisionFormProps = {
  decisionId?: string;
  initial: DecisionDraftData;
  initialStatus?: 'idle' | 'saved';
};

const emptyErrors: FormErrors = { options: {} };

function draftOf(record: DecisionRecordData): DecisionDraftData {
  return {
    category: record.decision.category,
    options: record.decision.options.map((option) => ({
      enabled: option.enabled,
      emoji: option.emoji,
      id: option.id,
      label: option.label,
      weight: option.weight,
    })),
    title: record.decision.title,
  };
}

function createEmptyOption() {
  return {
    id: crypto.randomUUID(),
    label: '',
    weight: DECISION_LIMITS.weightDefault,
    enabled: true,
  };
}

function errorMessages() {
  return {
    formInvalid: t('formInvalid'),
    optionDuplicate: t('optionDuplicate'),
    optionRequired: t('optionRequired'),
    optionTooLong: t('optionTooLong'),
    titleRequired: t('titleRequired'),
    titleTooLong: t('titleTooLong'),
  };
}

export default function DecisionForm({
  decisionId,
  initial,
  initialStatus = 'idle',
}: DecisionFormProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<DecisionDraftData>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<SaveStatus>(initialStatus);
  const [openEmojiId, setOpenEmojiId] = useState<string | null>(null);
  const pendingFocusId = useRef<string | null>(null);
  const isCaseView = searchParams.get('view') === 'case';
  const parsed = useMemo(() => DecisionDraft.safeParse(draft), [draft]);
  const caseOptions = useMemo(() => (parsed.success ? parsed.data.options : []), [parsed]);
  const errors = useMemo(() => {
    if (!submitted || parsed.success) {
      return emptyErrors;
    }

    return getFormErrors(parsed.error.issues, draft, errorMessages());
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
      const nextErrors = getFormErrors(parsed.error.issues, draft, errorMessages());
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

      navigate(`/decisions/${record.decision.id}/edit${location.search}`, {
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

    const option = createEmptyOption();
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
      <CaseOpening backTo={location.pathname} options={caseOptions} title={parsed.data.title} />
    );
  }

  return (
    <main className={styles.screen}>
      <form className={styles.content} onSubmit={handleSave}>
        <BackLink to="/">{t('back')}</BackLink>
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
                  onToggleEmoji={() =>
                    setOpenEmojiId((current) => (current === option.id ? null : option.id))
                  }
                  onUpdate={(update) => updateOption(option.id, update)}
                />
              </li>
            ))}
          </ul>
        </section>

        <Button
          disabled={draft.options.length >= DECISION_LIMITS.maxOptions}
          variant="outline"
          onClick={addOption}
        >
          {t('addOption')}
        </Button>
        {draft.options.length >= DECISION_LIMITS.maxOptions && (
          <p className={styles.hint}>{t('maxOptionsHint')}</p>
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
    </main>
  );
}

function optionInputId(optionId: string) {
  return `decision-option-${optionId}`;
}
