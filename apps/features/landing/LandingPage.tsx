'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CircleCheck,
  Droplet,
  GlassWater,
  GraduationCap,
  Leaf,
  Map as MapIcon,
  MapPin,
  Menu,
  ScrollText,
  Snowflake,
  Thermometer,
  Zap,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '#about', label: 'サービスについて' },
  { href: '#features', label: '機能' },
  { href: '#impact', label: '環境への貢献' },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll-reveal: fade/slide elements into view as they enter the viewport.
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>('.lp-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('lp-reveal-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f9fb] font-[family-name:var(--font-inter)] text-[#191c1e] antialiased">
      {/* TopAppBar */}
      <header className="fixed top-0 z-50 h-20 w-full border-b border-white/20 bg-white/70 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 md:px-16">
          <Link href="/" className="group flex items-center gap-2">
            <Droplet className="h-8 w-8 fill-[#00685f] text-[#00685f]" />
            <span className="text-2xl font-bold tracking-tight text-[#00685f]">
              キャリボト
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                className="font-medium text-[#3d4947] transition-colors hover:text-[#00685f]"
                href={link.href}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/map"
              className="rounded-full bg-[#00685f] px-6 py-2.5 font-bold text-white transition-all hover:bg-[#008378] active:scale-95"
            >
              使ってみる
            </Link>
          </nav>
          <button
            type="button"
            aria-label="メニューを開く"
            aria-expanded={menuOpen}
            className="text-[#00685f] md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Menu className="h-8 w-8" />
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <nav className="border-b border-white/20 bg-white/90 px-5 py-4 backdrop-blur-md md:hidden">
            <ul className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    className="block font-medium text-[#3d4947] transition-colors hover:text-[#00685f]"
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/map"
                  className="block rounded-full bg-[#00685f] px-6 py-2.5 text-center font-bold text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  使ってみる
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="lp-hero-gradient relative flex min-h-[85vh] items-center justify-center overflow-hidden px-5">
          <div
            className="lp-floating absolute top-1/4 -left-20 h-96 w-96 rounded-full bg-[#00685f]/20 blur-[100px]"
            style={{ animationDelay: '0s' }}
          />
          <div
            className="lp-floating absolute bottom-1/4 -right-20 h-96 w-96 rounded-full bg-[#0058be]/20 blur-[100px]"
            style={{ animationDelay: '-3s' }}
          />
          <div className="z-10 mx-auto max-w-4xl text-center">
            <div className="lp-glass-card lp-floating mb-8 inline-flex rounded-[1.5rem] p-6">
              <Droplet className="h-20 w-20 fill-[#00685f] text-[#00685f]" />
            </div>
            <h1 className="mb-6 text-5xl font-extrabold tracking-tighter text-[#00685f] md:text-[64px]">
              キャリボト
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-[#3d4947]">
              豊中・吹田・箕面キャンパス対応。
              <br />
              リアルタイムで給水スポットの温度や稼働状況を確認できます。
            </p>
            <div className="mb-16 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/map"
                className="flex items-center justify-center gap-2 rounded-[1.5rem] bg-[#008378] px-8 py-4 text-lg font-bold text-[#f4fffc] transition-all hover:shadow-lg active:scale-95"
              >
                <MapIcon className="h-5 w-5" />
                給水マップを開く
              </Link>
              <a
                href="#about"
                className="lp-glass-card rounded-[1.5rem] px-8 py-4 text-lg font-bold transition-all hover:bg-white/90 active:scale-95"
              >
                使い方ガイド
              </a>
            </div>
            {/* Stats */}
            <div className="mx-auto grid max-w-2xl grid-cols-3 gap-4">
              <div className="p-4">
                <div className="mb-1 text-3xl font-bold text-[#00685f]">3</div>
                <div className="text-sm font-medium text-[#3d4947]">
                  全キャンパス
                </div>
              </div>
              <div className="border-x border-[#bcc9c6]/30 p-4">
                <div className="mb-1 text-3xl font-bold text-[#00685f]">
                  24/7
                </div>
                <div className="text-sm font-medium text-[#3d4947]">稼働中</div>
              </div>
              <div className="p-4">
                <div className="mb-1 text-3xl font-bold text-[#00685f]">
                  0円
                </div>
                <div className="text-sm font-medium text-[#3d4947]">
                  利用料金
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What is Cariboto? Section */}
        <section className="mx-auto max-w-7xl px-5 py-20 md:px-16" id="about">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold text-[#00685f] md:text-4xl">
              キャリボトとは？
            </h2>
            <div className="mx-auto h-1 w-16 rounded-full bg-[#6bd8cb]" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="lp-reveal lp-glass-card rounded-[1.5rem] border-l-4 border-[#00685f] p-6">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[0.75rem] bg-[#00685f]/10">
                <MapPin className="h-6 w-6 text-[#00685f]" />
              </div>
              <h3 className="mb-3 text-xl font-bold">リアルタイムマップ</h3>
              <p className="text-[#3d4947]">
                3キャンパスすべての給水スポットを正確な位置で簡単に見つけられます。
              </p>
            </div>
            <div className="lp-reveal lp-glass-card rounded-[1.5rem] border-l-4 border-[#006e2f] p-6">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[0.75rem] bg-[#006e2f]/10">
                <Leaf className="h-6 w-6 text-[#006e2f]" />
              </div>
              <h3 className="mb-3 text-xl font-bold">エコフレンドリー</h3>
              <p className="text-[#3d4947]">
                使い捨てプラスチックの削減に。マイボトルへの給水で持続可能な大学づくりに貢献。
              </p>
            </div>
            <div className="lp-reveal lp-glass-card rounded-[1.5rem] border-l-4 border-[#0058be] p-6">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-[0.75rem] bg-[#0058be]/10">
                <GraduationCap className="h-6 w-6 text-[#0058be]" />
              </div>
              <h3 className="mb-3 text-xl font-bold">学生による運営</h3>
              <p className="text-[#3d4947]">
                大阪大学の学生コミュニティのために、学生の手によって設計・運営されています。
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-[#f2f4f6] px-5 py-20 md:px-16" id="features">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-20 lg:grid-cols-2">
            <div>
              <h2 className="mb-8 text-3xl font-bold text-[#00685f] md:text-4xl">
                便利な機能
              </h2>
              <ul className="space-y-8">
                <li className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#00685f] text-white">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="mb-1 text-lg font-bold">すぐに見つかる</h4>
                    <p className="text-[#3d4947]">
                      建物内を歩き回る必要はありません。階数や部屋番号まで瞬時に把握できます。
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#00685f] text-white">
                    <CircleCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="mb-1 text-lg font-bold">稼働状況の確認</h4>
                    <p className="text-[#3d4947]">
                      メンテナンス状況をリアルタイム更新。現地に行く前に故障していないか確認できます。
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#00685f] text-white">
                    <Thermometer className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="mb-1 text-lg font-bold">温度が選べる</h4>
                    <p className="text-[#3d4947]">
                      冷水、常温などお好みの設定があるスポットをフィルター検索可能です。
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative">
              {/* Mockup Card */}
              <div className="lp-glass-card mx-auto max-w-sm rotate-3 rounded-[2.5rem] p-8 shadow-xl transition-transform duration-500 hover:rotate-0 lg:ml-auto">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <span className="rounded bg-[#00685f]/10 px-2 py-1 text-xs font-bold tracking-widest text-[#00685f] uppercase">
                      豊中キャンパス
                    </span>
                    <h3 className="mt-2 text-xl font-bold">基礎工学部 E3棟</h3>
                    <p className="text-[#3d4947]">1階 エレベーター横</p>
                  </div>
                  <GlassWater className="h-8 w-8 text-[#00685f]" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-[1rem] bg-white/50 p-3">
                    <span className="flex items-center gap-2 font-medium">
                      <BadgeCheck className="h-5 w-5 text-[#006e2f]" />
                      ステータス
                    </span>
                    <span className="font-bold text-[#006e2f]">稼働中</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[1rem] bg-white/50 p-3">
                    <span className="flex items-center gap-2 font-medium">
                      <Snowflake className="h-5 w-5 text-[#0058be]" />
                      設定温度
                    </span>
                    <span className="font-bold text-[#0058be]">5°C / 冷水</span>
                  </div>
                </div>
                <Link
                  href="/map"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[#00685f] py-3 font-bold text-white"
                >
                  ここに行く
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <div className="absolute top-0 left-0 -z-10 h-full w-full scale-150 rounded-full bg-[#00685f]/5 blur-3xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Origin Story */}
        <section className="mx-auto max-w-4xl px-5 py-20 md:px-16">
          <div className="lp-glass-card relative overflow-hidden rounded-[1.5rem] p-10">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <ScrollText className="h-32 w-32" />
            </div>
            <h2 className="mb-6 text-3xl font-bold text-[#00685f] md:text-4xl">
              誕生のきっかけ
            </h2>
            <div className="space-y-4 text-lg text-[#3d4947]">
              <p>
                キャリボトは、「給水場所が見つからず、重いペットボトルを持ち歩いたり、自動販売機に頼らざるを得ない」という学生の日常的な悩みから生まれました。
              </p>
              <p>
                広大な大阪大学のキャンパス内には、人目につかない廊下や研究棟の中に多くの給水スポットが隠れています。私たちはこれら「隠れたオアシス」をマップ化することで、より快適でサステナブルなキャンパスライフを実現したいと考えました。
              </p>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="px-5 py-20 md:px-16" id="impact">
          <div className="mx-auto max-w-7xl">
            {/* Image Gallery */}
            <div className="mb-20 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="group aspect-square overflow-hidden rounded-[1.5rem] shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="給水する学生"
                  className="h-full w-full transform object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsPp_eFu7p-3qhZr6Gz_Tmp7OAgeYVOeenO0bVhqcdv-UO7-Gi51hkNRHas_z7vUIxgFNGgUGrR2a8wyFetrKg2wA3ni9jFKeUz7PYcZ4Yj6ixc85CX7d4g0dnwqB2y98uwwr-g2qqZeY1iCEoLL3bDNp5FfpKTjQzN5afLyRTO6l39ZNOpFcRVaNCzxgIQd4eM_W71SP884UMgXyJwWiz909Yft2j-5l-T1rOQgO_C6QytE0iR8RdvNf_fycBDjgWFM-AoyeL3xA"
                />
              </div>
              <div className="group aspect-square overflow-hidden rounded-[1.5rem] shadow-md md:translate-y-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="大阪大学のキャンパス"
                  className="h-full w-full transform object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBi3iWDIZYnPv0jXPqfT7jFCUvqp6KGsqOWz0BZrao0Ksy1lEumVaAEkXTZCyU_UOjlrlEjOoyta_HKXRsAIgwgvU3ayhG_4qlwdA4gJevctAVJq6TdgpAU_IBOe1YSqGG65BZRANC5nNN130LsNNvK0_pVS8ZxiCLuAMokpZRGtJLa7z_RCx_dTOHxbMT4Jrz3m8wHlu7Rprexsi9tBz0uR5XnbQIoHzJuJ3IeN3Fcdc6NawAJU8nVp9Psgcn7eKd045KgSG9V1DQ"
                />
              </div>
              <div className="group aspect-square overflow-hidden rounded-[1.5rem] shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="冷たい水"
                  className="h-full w-full transform object-cover transition-transform duration-700 group-hover:scale-110"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6sWDCu8qpDvUaXabnuDL2WabnWBGoO8Vs2BX0CrKqfMCxzNzseevvjQdKDOO6z2rcw15NoJINU0EftkGGe7EhXbL3rdhl7jAgIzETfuvBeB88bUOhCHbNPD8adPvFxA5XQp9Z_vrG1UhewF7xD7U7SD5FE5tJTcFIFXh_dTZcDKiHrMZoRN9Tm0Ay5dNQ-G0lYDW3WLix_WUXeCCYKuOTanZOrlAvJYB8LSUq8j_8-CvtiAPL3_HMpS2xqCJ7iQZ4nvpV7ytEA9k"
                />
              </div>
            </div>
            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:mt-24">
              <div className="lp-reveal rounded-[2.5rem] border border-[#006e2f]/20 bg-[#006e2f]/5 p-10">
                <Leaf className="mb-6 h-12 w-12 fill-[#006e2f] text-[#006e2f]" />
                <h3 className="mb-4 text-xl font-bold text-[#006e2f]">
                  地球のために
                </h3>
                <p className="text-lg text-[#3d4947]">
                  1回の給水が、1本のプラスチックゴミ削減につながります。阪大全体で1学期あたり10万本以上の削減を目指しましょう。
                </p>
              </div>
              <div className="lp-reveal rounded-[2.5rem] border border-[#2170e4]/20 bg-[#2170e4]/5 p-10">
                <Droplet className="mb-6 h-12 w-12 fill-[#0058be] text-[#0058be]" />
                <h3 className="mb-4 text-xl font-bold text-[#0058be]">
                  お財布のために
                </h3>
                <p className="text-lg text-[#3d4947]">
                  自販機の飲み物は1本160円以上。1日2回給水すれば、年間で約32,000円の節約になります。賢く水分補給しましょう。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* QR Access Guide */}
        <section className="bg-[#00685f]/5 px-5 py-20 text-center md:px-16">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-6 text-3xl font-bold text-[#00685f] md:text-4xl">
              QRコードでクイックアクセス
            </h2>
            <p className="mb-10 text-lg text-[#3d4947]">
              キャンパス内の給水器にあるキャリボトのステッカーを探してください。コードをスキャンするだけで不具合の報告やメンテナンス履歴を確認できます。
            </p>
            <div className="lp-glass-card inline-block rounded-[1.5rem] border-2 border-dashed border-[#00685f]/30 p-6">
              <div className="flex h-48 w-48 items-center justify-center rounded-[1rem] bg-white p-4">
                <div className="grid h-full w-full grid-cols-2 gap-2 opacity-40">
                  <div className="rounded-sm bg-[#00685f]" />
                  <div className="rounded-sm bg-[#00685f]" />
                  <div className="rounded-sm bg-[#00685f]" />
                  <div className="rounded-sm border-2 border-[#00685f]" />
                </div>
              </div>
              <p className="mt-4 text-xs font-bold tracking-widest text-[#00685f] uppercase">
                現場でスキャン
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 py-20">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[3rem] bg-[#008378] p-12 text-center md:p-20">
            <div className="pointer-events-none absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                  backgroundSize: '40px 40px',
                }}
              />
            </div>
            <h2 className="relative z-10 mb-8 text-4xl font-extrabold text-white md:text-5xl">
              今日から給水を始めよう
            </h2>
            <p className="relative z-10 mx-auto mb-12 max-w-xl text-xl text-white/80">
              何千人もの阪大生と一緒に、サステナブルな給水ムーブメントに参加しませんか？
            </p>
            <Link
              href="/map"
              className="relative z-10 inline-block rounded-full bg-white px-10 py-5 text-xl font-bold text-[#00685f] transition-all hover:-translate-y-1 hover:shadow-2xl active:scale-95"
            >
              給水マップを開く
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-12 w-full rounded-t-[0.75rem] bg-[#eceef0]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 py-12 md:flex-row md:px-16">
          <div className="flex flex-col items-center gap-4 md:items-start">
            <div className="flex items-center gap-2">
              <Droplet className="h-8 w-8 fill-[#00685f] text-[#00685f]" />
              <span className="text-xl font-extrabold text-[#00685f]">
                キャリボト
              </span>
            </div>
            <p className="text-sm opacity-70">
              © 2024 キャリボト. 大阪大学サステナビリティプロジェクト.
            </p>
            {/* TODO(#166): 正式なキャリボトのコンタクトメールに置き換える */}
            <p className="text-sm font-medium text-[#00685f]">
              contact@cariboto.osaka-u.ac.jp
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a
              className="font-medium text-[#3d4947] transition-all hover:text-[#00685f]"
              href="https://www.osaka-u.ac.jp/ja"
              target="_blank"
              rel="noopener noreferrer"
            >
              大阪大学公式サイト
            </a>
            <a
              className="font-medium text-[#3d4947] transition-all hover:text-[#00685f]"
              href="#"
            >
              報告書
            </a>
            <a
              className="font-medium text-[#3d4947] transition-all hover:text-[#00685f]"
              href="#features"
            >
              機能一覧
            </a>
            <a
              className="font-medium text-[#3d4947] transition-all hover:text-[#00685f]"
              href="#impact"
            >
              環境への貢献
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
