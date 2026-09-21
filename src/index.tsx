
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import { ToastProvider } from './services/ToastContext';
import '../index.css';

// Suppress sensitive info and non-essential logs
declare global {
  interface Window {
    __deferredInstallPrompt?: any;
  }
}

if (typeof window !== 'undefined') {
  // Vite event fired when a dynamic import fails due to a new deployment hash mismatch
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    console.warn('[Vite Deployment Sync] Preload error detected. Reloading for latest assets...');
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(() => {});
    }
    window.location.reload();
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '');
    if (
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('dynamically imported module')
    ) {
      event.preventDefault();
      window.location.reload();
      return;
    }
    if (
      msg.includes('message channel closed') || 
      msg.includes('asynchronous response') || 
      msg.includes('listener indicated') ||
      msg.includes('Could not establish connection') ||
      msg.includes('Receiving end does not exist') ||
      msg.includes('chrome-extension://')
    ) {
      event.preventDefault();
    }
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__deferredInstallPrompt = e;
    console.log('[PWA] beforeinstallprompt captured globally.');
  });
}
if (typeof window !== 'undefined') {
  const originalLog = console.log;
  const originalInfo = console.info;
  const suppressedKeywords = [
    'vercel.com/oss', 'vercel.com/careers', 'vercel-status.com',
    'Fetch [', 'Save Error [', 'raw records', 'to Supabase', 
    'allocation_requests', 'mpesa_transactions', 'users', 'institutions'
  ];

  const isProduction = (import.meta as any).env.PROD || window.location.hostname !== 'localhost';
  const isDebugMode = new URLSearchParams(window.location.search).has('debug');

  const filterLogs = (originalFn: any) => (...args: any[]) => {
    // 1. Kill all non-error logs in production unless debug mode is active
    if (isProduction && !isDebugMode) return;

    // 2. Filter sensitive keywords in dev/debug mode
    const isSuppressed = args.some(arg =>
      typeof arg === 'string' && suppressedKeywords.some(kw => arg.includes(kw))
    );
    
    if (!isSuppressed) {
      originalFn(...args);
    }
  };

  console.log = filterLogs(originalLog);
  console.info = filterLogs(originalInfo);
}

class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("DEBUG: Top-level crash caught:", error, errorInfo);
    
    // Handle Vite/Webpack chunk loading errors & stale cached chunk mismatches (including React Error #300 / hook mismatches)
    const isChunkLoadFailed = 
      /Failed to fetch dynamically imported module/i.test(error.message) || 
      /error loading dynamically imported module/i.test(error.message) ||
      /dynamically imported module/i.test(error.message) ||
      /Loading chunk/i.test(error.message) ||
      /before initialization/i.test(error.message) ||
      /ReferenceError/i.test(error.message) ||
      /Minified React error #(300|301|306|310|418|423)/i.test(error.message) ||
      /Rendered more hooks/i.test(error.message) ||
      /Rendered fewer hooks/i.test(error.message);
      
    if (isChunkLoadFailed) {
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(() => {});
      }
      const reloadCount = parseInt(sessionStorage.getItem('eduai_chunk_reload_count') || '0', 10);
      if (reloadCount < 2) {
        sessionStorage.setItem('eduai_chunk_reload_count', String(reloadCount + 1));
        window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
        return;
      }
    }
    sessionStorage.removeItem('eduai_chunk_reload_count');
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#ef4444' }}>Application Refresh Required</h1>
          <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '500px', margin: '10px auto 20px' }}>
            A newer application bundle has been loaded or a temporary script synchronization occurred ({this.state.error?.message}).
          </p>
          <button 
            onClick={() => {
              if ('caches' in window) {
                caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
              }
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(() => {});
              }
              sessionStorage.clear();
              window.location.href = window.location.origin + window.location.pathname + '?refresh=' + Date.now();
            }} 
            style={{ padding: '12px 24px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
          >
            Clear Cache & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
