import { useEffect } from 'react';
import { Route, Routes } from 'react-router';

import NotFoundPage from './NotFoundPage';
import HomePage from '../features/home/HomePage';
import PresetCasePage from '../features/presets/PresetCasePage';
import { ensureSession } from '../lib/api/session';

export default function App() {
  useEffect(() => {
    void ensureSession().catch(() => {});
  }, []);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/presets/:slug" element={<PresetCasePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
