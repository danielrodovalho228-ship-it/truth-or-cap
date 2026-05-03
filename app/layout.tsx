import type { Metadata, Viewport } from 'next';
import { Fraunces, Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { BottomNavGate } from '@/components/layout/BottomNavGate';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { getLang } from '@/lib/i18n/server';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://truthorcapapp.com'),
  title: {
    default: 'Truth or Cap — Can your friends spot the lie?',
    template: '%s | Truth or Cap',
  },
  description:
    'The AI-powered voice + video lie detector game. Record an answer, send to friends, see if they can spot the cap.',
  applicationName: 'Truth or Cap',
  keywords: [
    'lie detector game',
    'truth or cap',
    'party game',
    'voice analysis',
    'social game',
    'gen z game',
  ],
  authors: [{ name: 'Truth or Cap' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'pt_BR',
    url: 'https://truthorcapapp.com',
    siteName: 'Truth or Cap',
    title: 'Truth or Cap — Can your friends spot the lie?',
    description: 'AI-powered lie detector game. Record. Send. Watch friends fail.',
    images: [
      { url: '/og-default.png', width: 1200, height: 630, alt: 'Truth or Cap' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@truthorcap',
    creator: '@truthorcap',
    title: 'Truth or Cap',
    description: 'AI-powered lie detector game.',
    images: ['/og-default.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Truth or Cap',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();
  return (
    <html
      lang={lang}
      className={`${fraunces.variable} ${manrope.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-bg text-fg antialiased min-h-screen pb-16">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-fg text-bg px-4 py-2 rounded"
        >
          Skip to content
        </a>
        <Providers>
          {children}
          <BottomNavGate />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
