import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASTRO-SENTINEL // Autonomous Astronaut Digital Twin',
  description:
    'NASA Space Apps Challenge 2026 — a 3D holographic astronaut digital twin with an edge AI flight surgeon for autonomous deep-space medical triage.',
  keywords: [
    'NASA Space Apps',
    'digital twin',
    'edge AI',
    'flight surgeon',
    'deep space',
    'astronaut health',
  ],
};

export const viewport: Viewport = {
  themeColor: '#050814',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(() => {
            try {
              var stored = window.localStorage.getItem('as-theme');
              var theme = stored === 'light' || stored === 'dark'
                ? stored
                : (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
              document.documentElement.setAttribute('data-theme', theme);
            } catch (e) {
              document.documentElement.setAttribute('data-theme', 'dark');
            }
          })();`}
        </Script>
        {children}
      </body>
    </html>
  );
}
