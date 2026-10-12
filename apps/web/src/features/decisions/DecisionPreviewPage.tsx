import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useNavigate, useParams } from 'react-router';

import NotFoundPage from '../../app/NotFoundPage';
import Button from '../../components/ui/Button';
import DecisionPreview from '../preview/DecisionPreview';
import DecisionLoadState from './DecisionLoadState';
import { deleteDecision } from '../../lib/api/decisions';
import { ApiClientError } from '../../lib/api/client';
import { t } from '../../i18n';
import { useDecisionRecord } from './useDecisionRecord';
import styles from './DecisionPreviewPage.module.css';

const cancelButtonId = 'decision-delete-cancel';
const deleteButtonId = 'decision-delete-button';

export default function DecisionPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const recordState = useDecisionRecord(id);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const wasConfirming = useRef(false);

  useEffect(() => {
    if (confirming) {
      document.getElementById(cancelButtonId)?.focus();
    } else if (wasConfirming.current) {
      document.getElementById(deleteButtonId)?.focus();
    }
    wasConfirming.current = confirming;
  }, [confirming]);

  if (recordState.status !== 'loaded') {
    return <DecisionLoadState backTo="/" state={recordState} width="wide" />;
  }
  if (!id) return <NotFoundPage />;

  const { record } = recordState;
  const { decision } = record;

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(false);
    try {
      await deleteDecision(id);
      navigate('/', { replace: true });
    } catch (error: unknown) {
      if (error instanceof ApiClientError && error.status === 404) {
        navigate('/', { replace: true });
        return;
      }
      setDeleting(false);
      setDeleteError(true);
    }
  };

  const actions = confirming ? (
    <div className={styles.confirmRow}>
      <p>{t('deleteConfirm')}</p>
      <div className={styles.confirmActions}>
        <Button
          disabled={deleting}
          id={cancelButtonId}
          variant="outline"
          onClick={() => setConfirming(false)}
        >
          {t('cancel')}
        </Button>
        <Button
          disabled={deleting}
          id={deleteButtonId}
          variant="danger"
          onClick={() => void handleDelete()}
        >
          {deleting ? t('deleting') : t('delete')}
        </Button>
      </div>
      {deleteError && (
        <p className={styles.deleteError} role="alert">
          {t('deleteFailed')}
        </p>
      )}
    </div>
  ) : (
    <div className={styles.actions}>
      <Link className={styles.editAction} state={{ record }} to={`/decisions/${id}/edit`}>
        {t('edit')}
      </Link>
      <button
        className={styles.deleteAction}
        id={deleteButtonId}
        type="button"
        onClick={() => setConfirming(true)}
      >
        {t('delete')}
      </button>
    </div>
  );

  return (
    <>
      <title>{`${decision.title} · ${t('title')}`}</title>
      <DecisionPreview
        backTo="/"
        openTo={`/decisions/${id}/open`}
        options={decision.options}
        title={decision.title}
      >
        {actions}
      </DecisionPreview>
      <Outlet context={record} />
    </>
  );
}
