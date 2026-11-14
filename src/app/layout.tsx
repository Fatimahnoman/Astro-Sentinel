import type { Metadata, Viewport } from 'next';
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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
