import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { SharedCaseData } from '@piko/domain';

import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { ApiClientError } from '../../lib/api/client';
import { t } from '../../i18n';
import { revokeShare } from '../../lib/api/shares';
import { formatHistoryTime } from '../history/historyTime';
import styles from './SharedLinkList.module.css';

type SharedLinkListProps = {
  shares: readonly SharedCaseData[];
  now: Date;
  onRevoked: (id: string) => void;
};

function revokeButtonId(id: string): string {
  return `shared-link-revoke-${id}`;
}

function cancelButtonId(id: string): string {
  return `shared-link-cancel-${id}`;
}

export default function SharedLinkList({ shares, now, onRevoked }: SharedLinkListProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!confirmingId) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      document.getElementById(cancelButtonId(confirmingId))?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [confirmingId]);

  const openConfirm = (id: string) => {
    setErrorId(null);
    setConfirmingId(id);
  };

  const cancelConfirm = (id: string) => {
    setConfirmingId(null);
    setErrorId(null);
    requestAnimationFrame(() => {
      document.getElementById(revokeButtonId(id))?.focus();
    });
  };

  const handleRevoke = async (id: string) => {
    if (revokingId !== null) {
      return;
    }

    setRevokingId(id);
    setErrorId(null);

    try {
      await revokeShare(id);
      if (!mountedRef.current) {
        return;
      }

      setRevokingId(null);
      setConfirmingId(null);
      onRevoked(id);
    } catch (error: unknown) {
      if (!mountedRef.current) {
        return;
      }

      if (error instanceof ApiClientError && error.status === 404) {
        setRevokingId(null);
        setConfirmingId(null);
        onRevoked(id);
        return;
      }

      setRevokingId(null);
      setErrorId(id);
    }
  };

  return (
    <Card className={styles.listCard} tone="surface">
      <ul className={styles.list}>
        {shares.map((share) => {
          const result = share.result;
          const winner = result
            ? share.options.find((option) => option.id === result.winnerId)
            : undefined;
          const confirming = confirmingId === share.id;
          const revoking = revokingId === share.id;

          return (
            <li className={styles.item} key={share.id}>
              <div className={styles.row}>
                <div className={styles.details}>
                  <Link className={styles.title} to={`/s/${share.id}`}>
                    {share.title}
                  </Link>
                  <p className={styles.meta}>
                    {winner && (
                      <>
                        {winner.emoji && <span aria-hidden="true">{winner.emoji}</span>}{' '}
                        {winner.label} ·{' '}
                      </>
                    )}
                    {share.expiresAt ? (
                      <>
                        {t('shareExpires')}{' '}
                        <time dateTime={share.expiresAt}>
                          {formatHistoryTime(share.expiresAt, now)}
                        </time>
                      </>
                    ) : (
                      t('shareNoExpiry')
                    )}
                  </p>
                  {errorId === share.id && (
                    <p className={styles.error} role="alert">
                      {t('revokeFailed')}
                    </p>
                  )}
                </div>

                {confirming ? (
                  <div className={styles.confirm}>
                    <p>{t('revokeConfirm')}</p>
                    <div className={styles.confirmActions}>
                      <Button
                        disabled={revoking}
                        id={cancelButtonId(share.id)}
                        variant="outline"
                        onClick={() => cancelConfirm(share.id)}
                      >
                        {t('cancel')}
                      </Button>
                      <Button
                        disabled={revoking}
                        variant="danger"
                        onClick={() => void handleRevoke(share.id)}
                      >
                        {revoking ? t('revoking') : t('revoke')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className={styles.action}
                    id={revokeButtonId(share.id)}
                    variant="outline"
                    onClick={() => openConfirm(share.id)}
                  >
                    {t('revoke')}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
