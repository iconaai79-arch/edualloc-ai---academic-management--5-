// Register Service Worker for SpeechBuddy AI PWA Offline Support

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SpeechBuddy AI PWA ServiceWorker registered:', registration.scope);
        })
        .catch((error) => {
          console.error('SpeechBuddy AI PWA ServiceWorker registration failed:', error);
        });
    });
  }
}
