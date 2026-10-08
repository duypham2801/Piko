import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/fonts.css';
import './styles/tokens.css';
import './styles/global.css';

import App from './App';

const DesignPage = import.meta.env.DEV
  ? lazy(() => import('./pages/design/DesignPage'))
  : null;
const showDesign = DesignPage !== null && window.location.pathname === '/design';
const content = showDesign && DesignPage ? (
  <Suspense fallback={null}>
    <DesignPage />
  </Suspense>
) : (
  <App />
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {content}
  </StrictMode>,
);
