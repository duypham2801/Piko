import { useCallback, useEffect, useState } from 'react';

import { HealthResponse } from '@piko/domain';
import type { HealthResponseData, MeResponseData } from '@piko/domain';

import { t } from './i18n';
import { apiGet } from './lib/api/client';
import { ensureSession } from './lib/api/session';

interface PageData {
  health: HealthResponseData;
  me: MeResponseData;
}

export default function App() {
  const [data, setData] = useState<PageData | null>(null);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async (): Promise<PageData> => {
    const [health, me] = await Promise.all([
      apiGet('/api/healthz', HealthResponse),
      ensureSession(),
    ]);
    return { health, me };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void load()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setHasError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [load]);

  const retry = useCallback(() => {
    setHasError(false);
    void load()
      .then((result) => setData(result))
      .catch(() => setHasError(true));
  }, [load]);

  if (hasError) {
    return (
      <main>
        <h1>{t('title')}</h1>
        <p>{t('tagline')}</p>
        <p>{t('error')}</p>
        <button type="button" onClick={retry}>
          {t('retry')}
        </button>
      </main>
    );
  }

  if (!data) {
    return (
      <main>
        <h1>{t('title')}</h1>
        <p>{t('tagline')}</p>
        <p>{t('loading')}</p>
      </main>
    );
  }

  const { health, me } = data;
  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('tagline')}</p>
      <p>
        {t('health')}: {t(health.status)}
      </p>
      <p>
        {t('database')}: {t(health.db)}
      </p>
      <p>
        {t('version')}: {health.version}
      </p>
      <p>
        {t('currentGuest')}: {me.user.id.slice(0, 8)}…
      </p>
      <p>
        {t('userKind')}: {t(me.user.kind)}
      </p>
    </main>
  );
}
