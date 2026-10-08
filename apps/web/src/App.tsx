import { useEffect } from 'react';

import CaseOpening from './features/case-opening/CaseOpening';
import { DEMO_POOL } from './features/case-opening/demoPool';
import { ensureSession } from './lib/api/session';

export default function App() {
  useEffect(() => {
    void ensureSession().catch(() => {});
  }, []);

  return <CaseOpening options={DEMO_POOL} />;
}
