import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import PwaRegister from '@/components/PwaRegister';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'ORDEO POS — ระบบจัดการร้านอาหารตามสั่ง & สแกนสั่งอาหาร',
  description: 'ระบบ POS ร้านอาหารตามสั่งขนาดเล็ก พร้อมสแกนสั่งอาหาร สต็อก และสะสมแต้มครบวงจร',
  manifest: '/manifest.json',
  applicationName: 'ORDEO POS',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ORDEO POS',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Prompt:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased font-sans text-slate-900 bg-[#F8FAFC] selection:bg-orange-500 selection:text-white">
        <ToastProvider>
          {children}
          <PwaRegister />
          <PwaInstallPrompt />
        </ToastProvider>
      </body>
    </html>
  );
}
