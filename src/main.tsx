import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OverlayAccessProvider } from './context/OverlayAccessContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <OverlayAccessProvider>
      <App />
    </OverlayAccessProvider>
  </ErrorBoundary>
);
