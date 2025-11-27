import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { startPerformanceMonitoring } from './lib/performance'

const container = document.getElementById("root")!;
const root = createRoot(container);

// Start performance monitoring
if (import.meta.env.DEV) {
  console.log('[Performance] Starting performance monitoring...');
  startPerformanceMonitoring();
}

// Production performance monitoring (more conservative)
if (import.meta.env.PROD) {
  startPerformanceMonitoring(60000); // Every minute
}

root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
