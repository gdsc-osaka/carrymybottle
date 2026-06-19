import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter, Jost, Noto_Sans_JP } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// Japanese face. Safari has no built-in Japanese sans default and falls back to
// Hiragino Mincho (明朝体) when none is supplied, so we self-host Noto Sans JP
// and put it in the --font-sans stack (see globals.css). The Japanese glyph set
// is large, so we don't preload it — `display: swap` lets text paint with the
// system fallback first and swap in Noto Sans JP once it loads.
const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: false,
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

// Display face for the wordmark — Jost is a free Futura-style geometric sans,
// used as the web fallback behind real Futura (see --font-display in globals.css).
const jost = Jost({
  variable: '--font-jost',
  subsets: ['latin'],
  weight: ['500', '700'],
});

export const metadata: Metadata = {
  title: 'キャリボト (Cariboto) - 大阪大学給水スポット検索',
  description:
    '豊中・吹田・箕面キャンパス対応。リアルタイムで給水スポットの温度や稼働状況を確認できる、大阪大学のマイボトル給水マップ。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${jost.variable} ${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        {/* アプリ全体のトースト表示先。これが無いと toast(...) が不可視になる。 */}
        <Toaster />
      </body>
    </html>
  );
}
