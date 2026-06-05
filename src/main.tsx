import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {HashRouter} from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Global error handling for robustness in the AI Studio environment
if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('CRITICAL APP ERROR:', { message, source, lineno, colno, error });
    // Don't alert the user with a browser alert, but log to console
    return false;
  };

  window.onunhandledrejection = (event) => {
    console.error('UNHANDLED PROMISE REJECTION:', event.reason);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
