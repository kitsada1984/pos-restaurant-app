'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      (window.location.protocol === 'https:' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1')
    ) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Auto update check every 30 minutes
            setInterval(() => {
              registration.update();
            }, 30 * 60 * 1000);
          })
          .catch((err) => {
            console.warn('Service Worker registration failed:', err);
          });
      });
    }
  }, []);

  return null;
}
