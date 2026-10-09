import { useEffect } from 'react';
import { Outlet } from 'react-router';

import { ensureSession } from '../lib/api/session';

export default function SessionLayout() {
  useEffect(() => {
    void ensureSession().catch(() => {});
  }, []);

  return <Outlet />;
}
