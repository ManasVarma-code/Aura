import './styles.css';
import '@fontsource/quicksand/300.css';
import '@fontsource/quicksand/400.css';
import '@fontsource/quicksand/500.css';
import '@fontsource/quicksand/600.css';
import '@fontsource/quicksand/700.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import NotificationBanner from './components/NotificationBanner';
import { AccountProvider } from './contexts/AccountContext';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary><AccountProvider><NotificationBanner /><App /></AccountProvider></ErrorBoundary>
  </React.StrictMode>
);
