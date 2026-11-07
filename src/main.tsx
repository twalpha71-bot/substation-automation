import { startOnlineTranslation } from './i18n/onlineTranslation';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { useSubstationStore } from './simulation/useSubstationStore';

// Optional direct preview link; ordinary navigation still opens the original landing page.
if (window.location.hash === '#ccna-diagrams') {
  useSubstationStore.getState().setActiveTab('CCNA_ACADEMY');
  window.__SAS_DEEP_LINK__ = { tab: 'CCNA_ACADEMY', moduleId: 'CCNA-M01', subTab: 'DIAGRAMS' };
}

if (window.location.hash === '#iec-diagrams') {
  useSubstationStore.getState().setActiveTab('IEC61850_ACADEMY');
  window.__SAS_DEEP_LINK__ = { tab: 'IEC61850_ACADEMY', moduleId: 'MOD-01', subTab: 'DIAGRAMS' };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

startOnlineTranslation();
