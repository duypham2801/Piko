import { useEffect, useId, useRef, useState } from 'react';
import type {
  DecisionDraftData,
  SelectionResultData,
  SharedCaseCreateData,
  SharedCaseData,
} from '@piko/domain';

import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import TextField from '../../components/ui/TextField';
import { t } from '../../i18n';
import { ApiClientError } from '../../lib/api/client';
import { createShare } from '../../lib/api/shares';
import styles from './ShareDialog.module.css';

type ShareStatus = 'idle' | 'creating' | 'error' | 'limit' | 'copied' | 'copyFailed';

type ShareDialogProps = {
  decision: DecisionDraftData;
  result: SelectionResultData;
  share: SharedCaseData | null;
  onShared: (share: SharedCaseData) => void;
  onClose: () => void;
};

const lifetimeOptions: readonly {
  value: SharedCaseCreateData['lifetime'];
  label: string;
}[] = [
  { value: '1d', label: t('shareLifetime1d') },
  { value: '7d', label: t('shareLifetime7d') },
  { value: '30d', label: t('shareLifetime30d') },
  { value: 'never', label: t('shareLifetimeNever') },
];

export default function ShareDialog({
  decision,
  result,
  share,
  onShared,
  onClose,
}: ShareDialogProps) {
  const [lifetime, setLifetime] = useState<SharedCaseCreateData['lifetime']>('7d');
  const [status, setStatus] = useState<ShareStatus>('idle');
  const requestRef = useRef(0);
  const linkFieldId = useId();

  useEffect(() => {
    return () => {
      requestRef.current += 1;
    };
  }, []);

  const handleCreate = async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setStatus('creating');

    try {
      const createdShare = await createShare({ decision, result, lifetime });
      if (requestRef.current !== requestId) {
        return;
      }

      onShared(createdShare);
      setStatus('idle');
    } catch (error: unknown) {
      if (requestRef.current !== requestId) {
        return;
      }

      setStatus(
        error instanceof ApiClientError &&
          error.status === 409 &&
          error.code === 'share_limit_reached'
          ? 'limit'
          : 'error',
      );
    }
  };

  const url = share ? new URL(`/s/${share.id}`, window.location.origin).href : undefined;

  const handleShare = async () => {
    if (!url) {
      return;
    }

    setStatus('idle');
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: decision.title, url });
        return;
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      setStatus('copyFailed');
      const linkField = document.getElementById(linkFieldId) as HTMLInputElement | null;
      linkField?.focus();
      linkField?.select();
    }
  };

  const createErrorMessage = status === 'limit' ? t('shareLimitReached') : t('shareFailed');
  const statusMessage =
    status === 'copied' ? t('linkCopied') : status === 'copyFailed' ? t('copyFailed') : '';

  return (
    <Sheet closeLabel={t('close')} title={t('shareTitle')} onClose={onClose}>
      <div className={styles.content}>
        {share === null ? (
          <>
            <p className={styles.hint}>{t('shareHint')}</p>
            <fieldset className={styles.lifetime}>
              <legend>{t('shareLifetimeLegend')}</legend>
              <div className={styles.lifetimeOptions}>
                {lifetimeOptions.map((option) => (
                  <label className={styles.lifetimeOption} key={option.value}>
                    <input
                      checked={lifetime === option.value}
                      className="visually-hidden"
                      name="share-lifetime"
                      type="radio"
                      value={option.value}
                      onChange={() => setLifetime(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Button disabled={status === 'creating'} fullWidth onClick={() => void handleCreate()}>
              {status === 'creating' ? t('creatingShareLink') : t('createShareLink')}
            </Button>
            {(status === 'error' || status === 'limit') && (
              <p className={styles.error} role="status">
                {createErrorMessage}
              </p>
            )}
          </>
        ) : (
          <>
            <TextField
              id={linkFieldId}
              label={t('shareLinkLabel')}
              readOnly
              value={url}
              onFocus={(event) => event.currentTarget.select()}
            />
            <Button fullWidth onClick={() => void handleShare()}>
              {typeof navigator.share === 'function' ? t('sendLink') : t('copyLink')}
            </Button>
            {statusMessage && (
              <p className={styles.status} role="status">
                {statusMessage}
              </p>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
