import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeAuth, isSupabaseDemoMode } from './services/supabase';

// Initialize authentication on app startup (only when Supabase is configured)
if (!isSupabaseDemoMode) {
  initializeAuth().then(() => {
    console.log('🚀 App authentication initialized');
  }).catch((err) => console.warn('Auth init failed:', err));
} else {
  console.warn('Supabase not configured — running in demo mode. Skipping auth initialization.');
}

// Service Worker handling
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In dev, aggressively unregister any existing SW (carried over from prod build) to avoid module fetch caching issues
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length) {
        console.log('[DEV] Unregistering stale service workers to prevent cached module issues');
      }
      registrations.forEach((reg) => reg.unregister());
    });
  } else if (import.meta.env.PROD) {
    // Register service worker for PWA in production
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered:', registration);
          // Check for updates every hour
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);