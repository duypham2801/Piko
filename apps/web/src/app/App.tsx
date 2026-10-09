import { Route, Routes } from 'react-router';

import NotFoundPage from './NotFoundPage';
import AppShell from './AppShell';
import SessionLayout from './SessionLayout';
import DecisionBuilderPage from '../features/builder/DecisionBuilderPage';
import DecisionCasePage from '../features/decisions/DecisionCasePage';
import DecisionPreviewPage from '../features/decisions/DecisionPreviewPage';
import HistoryPage from '../features/history/HistoryPage';
import HomePage from '../features/home/HomePage';
import PresetPreviewPage from '../features/presets/PresetPreviewPage';
import PresetCasePage from '../features/presets/PresetCasePage';
import SharedCasePage from '../features/share/SharedCasePage';

export default function App() {
  return (
    <Routes>
      <Route path="/s/:id" element={<SharedCasePage />} />
      <Route element={<SessionLayout />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/decisions/new" element={<DecisionBuilderPage />} />
          <Route path="/decisions/:id" element={<DecisionPreviewPage />} />
          <Route path="/decisions/:id/edit" element={<DecisionBuilderPage />} />
          <Route path="/decisions/:id/open" element={<DecisionCasePage />} />
          <Route path="/presets/:slug" element={<PresetPreviewPage />} />
          <Route path="/presets/:slug/open" element={<PresetCasePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
