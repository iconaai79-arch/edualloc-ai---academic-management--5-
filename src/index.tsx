
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import '../index.css';

// Suppress sensitive info and non-essential logs
if (typeof window !== 'undefined') {
  const originalLog = console.log;
  const originalInfo = console.info;
  const suppressedKeywords = [
    'vercel.com/oss', 'vercel.com/careers', 'vercel-status.com',
    'Fetch [', 'Save Error [', 'raw records', 'to Supabase', 
    'allocation_requests', 'mpesa_transactions', 'users', 'institutions'
  ];

  const isProduction = import.meta.env.PROD || window.location.hostname !== 'localhost';
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
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#ef4444' }}>Something went wrong.</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Reload Application
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
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);
