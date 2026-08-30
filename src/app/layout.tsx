import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ORDEO POS — ระบบจัดการร้านอาหารตามสั่ง & สแกนสั่งอาหาร',
  description: 'ระบบ POS ร้านอาหารตามสั่งขนาดเล็ก พร้อมสแกนสั่งอาหารผ่าน LINE / Web และ PromptPay Dynamic QR',
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
      </head>
      <body className="antialiased font-sans text-slate-900 bg-[#F8FAFC] selection:bg-orange-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
