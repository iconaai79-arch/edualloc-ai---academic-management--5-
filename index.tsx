
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

/**
 * World-class Error Reporting Utility
 * Catches runtime crashes before the React engine takes over,
 * ensuring the user never sees a "Blank Screen of Death".
 */
const reportError = (message: string, detail?: string) => {
    const root = document.getElementById('root');
    if (root) {
        root.innerHTML = `
            <div style="padding: 40px; font-family: sans-serif; background: #fef2f2; color: #991b1b; min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center;">
                <div style="max-width: 500px; width: 100%; background: white; padding: 40px; border-radius: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15); border: 1px solid #fee2e2;">
                    <div style="width: 64px; height: 64px; background: #fee2e2; color: #dc2626; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                        <svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                    </div>
                    <h1 style="margin: 0 0 12px; font-size: 28px; font-weight: 900; color: #111827; letter-spacing: -0.05em; text-transform: uppercase;">Handshake Interrupted</h1>
                    <p style="margin: 0 0 24px; line-height: 1.6; color: #6b7280; font-size: 15px;">${message}</p>
                    ${detail ? `
                    <div style="text-align: left; margin-bottom: 24px;">
                        <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #9ca3af; margin-bottom: 8px; letter-spacing: 0.05em;">Technical Diagnostics:</p>
                        <pre style="background: #f8fafc; padding: 16px; border-radius: 16px; font-size: 11px; overflow-x: auto; color: #475569; border: 1px solid #e2e8f0; font-family: monospace; white-space: pre-wrap; word-break: break-all; max-height: 150px;">${detail}</pre>
                    </div>` : ''}
                    <button onclick="window.location.reload()" style="width: 100%; background: #4f46e5; color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 800; cursor: pointer; transition: transform 0.2s; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);">Retry Registry Link</button>
                    <p style="margin-top: 24px; font-size: 11px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em;">EduAi Academic Management Platform</p>
                </div>
            </div>
        `;
    }
};

window.onerror = (msg, url, lineNo, columnNo, error) => {
    console.error('Fatal Application Error:', msg, error);
    reportError("A runtime execution error occurred during the initial application handshake. This usually indicates a broken module link or registry timeout.", error?.stack || String(msg));
    return false;
};

window.onunhandledrejection = (event) => {
    console.error('Unhandled Registry Rejection:', event.reason);
    reportError("A cloud registry promise was rejected during initialization.", String(event.reason));
};

const initApp = async () => {
    try {
        const rootElement = document.getElementById('root');
        if (!rootElement) throw new Error("DOM target 'root' not detected.");
        
        // Dynamically import App to ensure error handlers are established before module evaluation
        const { App } = await import('./components/App.tsx');

        ReactDOM.createRoot(rootElement).render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
    } catch (e: any) {
        reportError("The React engine failed to mount the application component tree.", e.stack || e.message);
    }
};

initApp();
