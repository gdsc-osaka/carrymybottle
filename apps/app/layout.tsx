import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter, Jost } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
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
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
