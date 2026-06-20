'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type Variants,
} from 'motion/react';
import { WaterRippleCanvas, type RipplePointer } from './WaterRippleCanvas';
import { SmoothScroll } from './SmoothScroll';
import { InquiryForm } from '@/features/inquiry/InquiryForm';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronDown,
  Droplet,
  GlassWater,
  Leaf,
  Map as MapIcon,
  MapPin,
  Menu,
  QrCode,
  Quote,
  Search,
  Snowflake,
  Sprout,
  Wallet,
  X,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '#about', label: 'サービスについて' },
  { href: '#features', label: '機能' },
  { href: '#impact', label: '環境への貢献' },
  { href: '#contact', label: 'お問い合わせ' },
];

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Stagger container for entrance choreography. */
const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

/** Individual item that rises and fades into place. */
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_OUT },
  },
};

/** Reusable scroll-reveal wrapper — replaces the old IntersectionObserver. */
function Reveal({
  children,
  className,
  delay = 0,
  y = 40,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      // prefers-reduced-motion 時はスクロール演出を無効化し、最終状態で即表示する。
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={reduce ? undefined : { duration: 0.7, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Counts up to `to` once it scrolls into view. */
function CountUp({
  to,
  className,
  suffix = '',
}: {
  to: number;
  className?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      count.set(to);
      return;
    }
    const controls = animate(count, to, { duration: 1.4, ease: EASE_OUT });
    return () => controls.stop();
  }, [inView, reduce, to, count]);

  return (
    <motion.span ref={ref} className={className}>
      {rounded}
    </motion.span>
  );
}

/** Slow scroll-linked parallax for editorial photography. */
function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
  range = 10,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  range?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`-${range}%`, `${range}%`],
  );
  return (
    <div ref={ref} className={`overflow-hidden ${className ?? ''}`}>
      <motion.img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={reduce ? undefined : { y }}
        className={`h-[120%] w-full -translate-y-[8%] object-cover ${imgClassName ?? ''}`}
      />
    </div>
  );
}

/** Editorial section label: eyebrow + thin rule. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-[0.7rem] font-semibold tracking-[0.32em] text-[#0f897f] uppercase">
      <span className="h-px w-8 bg-[#0f897f]/50" />
      {children}
    </span>
  );
}

/** Outlined teardrop with a glossy water bead inside — the hero emblem. */
function WaterDropEmblem({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 116"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="drop-stroke"
          x1="20"
          y1="8"
          x2="82"
          y2="112"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#5cbcae" />
          <stop offset="1" stopColor="#2f7fc6" />
        </linearGradient>
        <radialGradient
          id="drop-bead"
          cx="0.38"
          cy="0.3"
          r="0.8"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#d4eef1" />
          <stop offset="1" stopColor="#74bcc6" />
        </radialGradient>
      </defs>
      <path
        d="M50 8 C 50 8 80 50 80 78 A 30 30 0 1 1 20 78 C 20 50 50 8 50 8 Z"
        stroke="url(#drop-stroke)"
        strokeWidth="2.4"
      />
      <circle cx="50" cy="83" r="18.5" fill="url(#drop-bead)" />
      <ellipse
        cx="43"
        cy="75"
        rx="5.5"
        ry="3.6"
        fill="#ffffff"
        opacity="0.85"
      />
    </svg>
  );
}

const HERO_IMAGE = '/images/hero-water.webp';

function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [waterActive, setWaterActive] = useState(false);

  // Scroll-linked parallax: hero content drifts up and fades as you scroll past.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  // Pointer state consumed each frame by the WebGL water surface.
  const ripplePointer = useRef<RipplePointer>({
    x: 0.5,
    y: 0.5,
    moved: false,
    splash: false,
  });

  function handlePointer(e: React.PointerEvent<HTMLElement>, splash: boolean) {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = ripplePointer.current;
    p.x = (e.clientX - rect.left) / rect.width;
    p.y = (e.clientY - rect.top) / rect.height;
    p.moved = true;
    if (splash) p.splash = true;
  }

  const stats = [
    { icon: MapPin, value: <CountUp to={3} />, label: '全キャンパス' },
    { icon: Droplet, value: '24/7', label: '稼働中' },
    { icon: Leaf, value: <CountUp to={0} suffix="円" />, label: '利用料金' },
  ];

  return (
    <section
      ref={sectionRef}
      onPointerMove={(e) => handlePointer(e, false)}
      onPointerDown={(e) => handlePointer(e, true)}
      className="relative flex min-h-[92vh] items-center justify-center overflow-hidden px-5 py-24"
    >
      {/* Static water photo — fallback shown until/unless the WebGL water loads */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_IMAGE}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Interactive water surface — refracts the same photo on hover/touch */}
      {!reduce && (
        <WaterRippleCanvas
          pointer={ripplePointer}
          imageSrc={HERO_IMAGE}
          onActiveChange={setWaterActive}
          className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700 ${
            waterActive ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-white/25" />

      <motion.div
        className="relative z-10 flex w-full max-w-2xl flex-col items-center"
        style={{ y: contentY, opacity: contentOpacity }}
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Frosted glass card */}
        <motion.div
          variants={itemVariants}
          className="w-full rounded-[2rem] border border-white/50 bg-white/25 px-8 py-12 text-center shadow-[0_20px_60px_-15px_rgba(0,80,90,0.25)] backdrop-blur-xl sm:px-14"
        >
          {/* Droplet emblem */}
          <motion.div
            className="mb-1 flex justify-center"
            animate={reduce ? undefined : { y: [0, -8, 0] }}
            transition={{ duration: 6, ease: 'easeInOut', repeat: Infinity }}
          >
            <WaterDropEmblem className="h-24 w-24" />
          </motion.div>

          {/* Wordmark */}
          <h1 className="font-[family-name:var(--font-display)] font-medium">
            <span className="block text-3xl tracking-[0.18em] text-[#3a8d85] sm:text-4xl md:text-5xl">
              Carry My
            </span>
            <span className="block bg-gradient-to-r from-[#3aa597] to-[#2670c2] bg-clip-text pb-[0.1em] text-6xl tracking-[0.1em] text-transparent sm:text-7xl md:text-8xl">
              Bottle
            </span>
          </h1>

          {/* Divider */}
          <div className="mx-auto mt-3 mb-6 h-px w-12 bg-[#7fb5ad]" />

          {/* Subtitle */}
          <p className="mx-auto mb-9 max-w-lg text-sm leading-relaxed text-[#46595a] sm:text-base">
            豊中・吹田・箕面キャンパス対応。
            <br />
            リアルタイムで給水スポットの温度や稼働状況を確認できます。
          </p>

          {/* CTAs */}
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <motion.div
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Link
                href="/map"
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f897f] to-[#1f6fc4] px-7 py-3.5 font-bold text-white shadow-lg shadow-[#0f897f]/25 transition-shadow hover:shadow-xl hover:shadow-[#1f6fc4]/30"
              >
                <MapIcon className="h-5 w-5" />
                給水マップを開く
              </Link>
            </motion.div>
            <motion.a
              href="#about"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className="rounded-2xl border border-white/60 bg-white/40 px-7 py-3.5 font-bold text-[#2a4a48] backdrop-blur-sm transition-colors hover:bg-white/60"
            >
              使い方ガイド
            </motion.a>
          </div>
        </motion.div>

        {/* Stats pill */}
        <motion.div
          variants={itemVariants}
          className="mt-7 grid w-full max-w-2xl grid-cols-3 divide-x divide-white/50 rounded-3xl border border-white/40 bg-white/20 py-6 backdrop-blur-md"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1.5 px-3"
            >
              <div className="flex items-center gap-2.5 text-4xl font-bold text-[#1f6b64]">
                <stat.icon className="h-7 w-7 text-[#3a9d93]" />
                {stat.value}
              </div>
              <span className="text-lg font-medium text-[#5a6b6a]">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.a
        href="#about"
        aria-label="下にスクロール"
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[#3a6b66]"
        style={{ opacity: contentOpacity }}
      >
        <span className="text-[0.65rem] font-semibold tracking-[0.3em]">
          SCROLL
        </span>
        <motion.span
          animate={reduce ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
        >
          <ChevronDown className="h-5 w-5" />
        </motion.span>
      </motion.a>
    </section>
  );
}

/** ABOUT — editorial three-concept list instead of identical cards. */
const ABOUT_ITEMS = [
  {
    icon: MapPin,
    title: 'リアルタイムマップ',
    body: '3キャンパスすべての給水スポットを正確な位置で簡単に見つけられます。',
  },
  {
    icon: Leaf,
    title: 'エコフレンドリー',
    body: '使い捨てプラスチックの削減に。マイボトルへの給水で持続可能な大学づくりに貢献。',
  },
  {
    icon: Sprout,
    title: '学生による運営',
    body: '大阪大学の学生コミュニティのために、学生の手によって設計・運営されています。',
  },
];

function AboutSection() {
  return (
    <section className="relative px-5 py-28 md:px-16" id="about">
      <div className="mx-auto grid max-w-7xl gap-y-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-x-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Reveal>
            <Eyebrow>About</Eyebrow>
            <h2 className="mt-6 font-[family-name:var(--font-display)] text-4xl leading-[1.1] font-medium text-[#0c2b29] md:text-5xl">
              キャリボト
              <span className="text-[#0f897f]">とは？</span>
            </h2>
            <p className="mt-6 max-w-sm text-[1.05rem] leading-relaxed text-[#46595a]">
              阪大生のための給水スポット検索。歩き回らず、迷わず、いちばん近い一杯へ。
            </p>
          </Reveal>
        </div>

        <ul className="flex flex-col">
          {ABOUT_ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 0.08}>
              <li className="group grid grid-cols-[auto_1fr] items-start gap-x-6 border-t border-[#0c2b29]/10 py-9 first:border-t-0 sm:gap-x-10">
                <span className="font-[family-name:var(--font-display)] text-2xl font-medium text-[#0f897f]/40 tabular-nums sm:text-3xl">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <div className="flex items-center gap-3">
                    <item.icon className="h-6 w-6 text-[#0f897f]" />
                    <h3 className="text-xl font-bold text-[#0c2b29] sm:text-2xl">
                      {item.title}
                    </h3>
                  </div>
                  <p className="mt-3 max-w-xl text-[1.05rem] leading-relaxed text-[#46595a]">
                    {item.body}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** FEATURES — benefit list paired with a premium station preview. */
const FEATURES = [
  {
    title: 'すぐに見つかる',
    body: '建物内を歩き回る必要はありません。階数や部屋番号まで瞬時に把握できます。',
  },
  {
    title: '稼働状況の確認',
    body: 'メンテナンス状況をリアルタイム更新。現地に行く前に故障していないか確認できます。',
  },
  {
    title: '温度が選べる',
    body: '冷水、常温などお好みの設定があるスポットをフィルター検索可能です。',
  },
];

function FeaturesSection() {
  return (
    <section
      className="relative overflow-hidden bg-[#0c2b29] px-5 py-28 text-white md:px-16"
      id="features"
    >
      {/* subtle depth glow */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#0f897f]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-[#1f6fc4]/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2 lg:gap-24">
        <div>
          <Reveal>
            <Eyebrow>Features</Eyebrow>
            <h2 className="mt-6 font-[family-name:var(--font-display)] text-4xl leading-[1.1] font-medium md:text-5xl">
              現地に着く前に、
              <br />
              ぜんぶ分かる。
            </h2>
          </Reveal>

          <ul className="mt-12 flex flex-col">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 0.1} y={24}>
                <li className="grid grid-cols-[auto_1fr] gap-x-6 border-t border-white/10 py-7">
                  <span className="font-[family-name:var(--font-display)] text-lg text-[#6bd8cb] tabular-nums">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="mt-2 leading-relaxed text-white/65">
                      {feature.body}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>

        {/* Station preview */}
        <Reveal y={60} className="relative">
          <motion.div
            whileHover={{ y: -6 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative mx-auto max-w-sm overflow-hidden rounded-[2rem] bg-white text-[#0c2b29] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]"
          >
            <div className="relative h-44 overflow-hidden">
              <ParallaxImage
                src="/images/gallery-dispenser.webp"
                alt="給水機（ウォータースタンド）"
                className="absolute inset-0 h-full w-full"
                range={6}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
              <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold tracking-widest text-[#00685f] uppercase backdrop-blur">
                豊中キャンパス
              </span>
            </div>
            <div className="p-7">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">基礎工学部 E3棟</h3>
                  <p className="mt-1 text-sm text-[#46595a]">1階 エレベーター横</p>
                </div>
                <GlassWater className="h-7 w-7 text-[#00685f]" />
              </div>
              <div className="mt-5 space-y-2.5">
                <div className="flex items-center justify-between rounded-2xl bg-[#0f897f]/8 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <BadgeCheck className="h-5 w-5 text-[#006e2f]" />
                    ステータス
                  </span>
                  <span className="text-sm font-bold text-[#006e2f]">稼働中</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-[#1f6fc4]/8 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Snowflake className="h-5 w-5 text-[#0058be]" />
                    設定温度
                  </span>
                  <span className="text-sm font-bold text-[#0058be]">
                    5°C / 冷水
                  </span>
                </div>
              </div>
              <Link
                href="/map"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0c2b29] py-3.5 font-bold text-white transition-colors hover:bg-[#0f897f]"
              >
                ここに行く
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
          <p className="mx-auto mt-4 max-w-sm text-center text-xs text-white/45">
            画像はイメージ図であり、実際に設置されている場所ではない可能性があります。
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** OUR STORY — corporate-style mission statement with pull quote. */
function StorySection() {
  return (
    <section className="px-5 py-28 md:px-16">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <Eyebrow>Our Story</Eyebrow>
        </Reveal>

        <div className="mt-12 grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div>
            <Reveal>
              <Quote
                className="h-12 w-12 text-[#0f897f]/25"
                aria-hidden="true"
              />
              <blockquote className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-[1.35] font-medium text-[#0c2b29] md:text-[2.6rem] md:leading-[1.3]">
                地球にも市民にも
                <br className="hidden sm:block" />
                やさしい生活を、
                <span className="text-[#0f897f]">マイボトル</span>で。
              </blockquote>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="mt-10 max-w-xl space-y-5 text-[1.05rem] leading-[1.9] text-[#46595a]">
                <p>
                  キャリボトは
                  <strong className="font-semibold text-[#0c2b29]">
                    PETボトルごみ問題
                  </strong>
                  に着目し、マイボトルを使いやすい環境づくりと、マイボトルを使うような意識づくりを推進している学生団体です。
                </p>
                <p>
                  すでに設置されている給水機の存在を知らない学生がいる——その課題を解決し、
                  <strong className="font-semibold text-[#0c2b29]">
                    素早く給水できる環境
                  </strong>
                  を作りたい。その思いから、このアプリは誕生しました。
                </p>
              </div>
            </Reveal>
          </div>

          <Reveal y={50}>
            <div className="relative">
              <ParallaxImage
                src="/images/gallery-filling.webp"
                alt="給水機でマイボトルに給水する様子"
                className="aspect-[4/5] rounded-[2rem] shadow-[0_40px_80px_-40px_rgba(12,43,41,0.5)]"
                range={9}
              />
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-white px-6 py-5 shadow-xl">
                <p className="font-[family-name:var(--font-display)] text-3xl font-medium text-[#0c2b29]">
                  阪大マイボトル
                </p>
                <p className="text-sm text-[#5a6b6a]">推進プロジェクト</p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** IMPACT — full-bleed parallax band + planet/wallet value props. */
function ImpactSection() {
  return (
    <section id="impact" className="bg-[#f4f7f6]">
      {/* Full-bleed parallax band */}
      <div className="relative h-[60vh] min-h-[420px] overflow-hidden">
        <ParallaxImage
          src="/images/gallery-campus.webp"
          alt="大阪大学のキャンパスに並ぶマイボトル"
          className="absolute inset-0 h-full w-full"
          range={12}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c2b29]/80 via-[#0c2b29]/30 to-transparent" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-7xl px-5 pb-14 md:px-16">
            <Reveal>
              <Eyebrow>
                <span className="text-[#6bd8cb]">Impact</span>
              </Eyebrow>
              <h2 className="mt-5 max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-[1.15] font-medium text-white md:text-6xl">
                あなたの一杯が、
                <br />
                未来を変える。
              </h2>
            </Reveal>
          </div>
        </div>
      </div>

      {/* Value props — stacked full-width blocks (no side-by-side) */}
      <div className="mx-auto max-w-6xl px-5 md:px-16">
        {/* 地球のために — editorial statement */}
        <div className="border-b border-[#0c2b29]/10 py-20 md:py-24">
          <Reveal>
            <div className="grid items-start gap-7 md:grid-cols-[auto_1fr] md:gap-14">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#006e2f]/8">
                <Leaf className="h-8 w-8 fill-[#006e2f]/20 text-[#006e2f]" />
              </span>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-3xl leading-[1.2] font-medium text-[#006e2f] md:text-4xl">
                  地球のために
                </h3>
                <p className="mt-5 max-w-2xl text-xl leading-relaxed text-[#3d4947] md:text-2xl">
                  マイボトルへの給水を通して、環境問題へアクションをしてみませんか？
                </p>
                <p className="mt-6 text-[1.05rem] text-[#5a6b6a]">
                  たった
                  <span className="font-[family-name:var(--font-display)] text-2xl font-medium text-[#006e2f]">
                    −1
                  </span>
                  本のペットボトルから、はじめられる。
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* お財布のために — savings figure as the hero of this block */}
        <div className="py-20 md:py-24">
          <Reveal className="max-w-2xl">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1f6fc4]/8">
                <Wallet className="h-8 w-8 text-[#1f6fc4]" />
              </span>
              <h3 className="font-[family-name:var(--font-display)] text-3xl leading-[1.2] font-medium text-[#0058be] md:text-4xl">
                お財布のために
              </h3>
            </div>
            <p className="mt-6 text-xl leading-relaxed text-[#3d4947] md:text-2xl">
              マイボトルは続けるほどおトク。買い続けるより、ずっと経済的です。
            </p>
          </Reveal>

          <Reveal y={50} className="mt-12">
            <figure className="overflow-hidden rounded-[2rem] border border-[#0c2b29]/8 bg-white p-5 shadow-[0_40px_80px_-50px_rgba(12,43,41,0.45)] sm:p-10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/savings-comparison.webp"
                alt="ペットボトルを毎日購入した場合とマイボトルを使った場合の出費比較グラフ。マイボトルは約2ヶ月で元が取れ、4年間で約10万円の節約になる。"
                width={1600}
                height={971}
                loading="lazy"
                decoding="async"
                className="mx-auto w-full max-w-3xl"
              />
            </figure>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** HOW TO — three-step flow that replaces the old QR placeholder. */
const STEPS = [
  {
    icon: Search,
    title: '探す',
    body: 'マップで近くの給水スポットを検索。稼働状況と設定温度をその場で確認できます。',
  },
  {
    icon: Droplet,
    title: '給水する',
    body: 'マイボトルを持って、いちばん近いスポットへ。料金はかかりません。',
  },
  {
    icon: QrCode,
    title: '報告する',
    body: '給水機のQRコードから、不具合の報告やメンテナンス履歴の確認ができます。',
  },
];

function HowToSection() {
  return (
    <section className="px-5 py-28 md:px-16">
      <div className="mx-auto max-w-7xl">
        <Reveal className="max-w-2xl">
          <Eyebrow>How to use</Eyebrow>
          <h2 className="mt-6 font-[family-name:var(--font-display)] text-4xl leading-[1.1] font-medium text-[#0c2b29] md:text-5xl">
            探して、給水して、報告する。
          </h2>
          <p className="mt-5 text-[1.05rem] leading-relaxed text-[#46595a]">
            たった3ステップ。現場のQRコードから、その場で不具合も伝えられます。
          </p>
        </Reveal>

        <div className="relative mt-16 grid gap-x-10 gap-y-12 md:grid-cols-3">
          {/* connecting line */}
          <div className="pointer-events-none absolute top-7 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-[#0f897f]/30 via-[#1f6fc4]/30 to-[#0f897f]/30 md:block" />
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.12}>
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-[0_12px_30px_-12px_rgba(12,43,41,0.4)] ring-1 ring-[#0c2b29]/5">
                  <step.icon className="h-6 w-6 text-[#0f897f]" />
                </div>
                <div className="mt-6 flex items-baseline gap-3">
                  <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-widest text-[#0f897f]/60">
                    STEP {i + 1}
                  </span>
                </div>
                <h3 className="mt-2 text-2xl font-bold text-[#0c2b29]">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-xs text-[1.02rem] leading-relaxed text-[#46595a]">
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** FINAL CTA — full-bleed water photo with overlaid call to action. */
function FinalCta() {
  return (
    <section className="px-5 pb-28">
      <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem]">
        <ParallaxImage
          src={HERO_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full"
          range={10}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#00685f]/90 via-[#0c2b29]/80 to-[#0058be]/85" />
        <div className="relative px-8 py-20 text-center md:px-16 md:py-28">
          <h2 className="font-[family-name:var(--font-display)] text-4xl leading-[1.1] font-medium text-white md:text-6xl">
            今日から給水を始めよう
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/80">
            何千人もの阪大生と一緒に、サステナブルな給水ムーブメントに参加しませんか？
          </p>
          <motion.div
            className="mt-10 inline-block"
            whileHover={{ scale: 1.04, y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-5 text-lg font-bold text-[#00685f] shadow-2xl shadow-black/20 transition-shadow hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)]"
            >
              給水マップを開く
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </Reveal>
    </section>
  );
}

/** CONTACT — editorial split: intro on the left, form on the right. */
function ContactSection() {
  return (
    <section className="px-5 py-28 md:px-16" id="contact">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <Reveal>
          <Eyebrow>Contact</Eyebrow>
          <h2 className="mt-6 font-[family-name:var(--font-display)] text-4xl leading-[1.1] font-medium text-[#0c2b29] md:text-5xl">
            お問い合わせ
          </h2>
          <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-[#46595a]">
            ご質問・給水機の設置リクエスト・ご意見などをお寄せください。確認次第、ご記入のメールアドレスへご返信いたします。
          </p>
          <a
            href="mailto:carry.my.bottle@gmail.com"
            className="mt-8 inline-flex items-center gap-2 text-[#0f897f] transition-colors hover:text-[#00685f]"
          >
            <span className="font-medium">carry.my.bottle@gmail.com</span>
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Reveal>
        <Reveal y={40} delay={0.1}>
          <InquiryForm />
        </Reveal>
      </div>
    </section>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f4f7f6] font-[family-name:var(--font-inter)] text-[#0c2b29] antialiased">
      <SmoothScroll />

      {/* TopAppBar */}
      <motion.header
        initial={reduce ? false : { y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={reduce ? undefined : { duration: 0.6, ease: EASE_OUT }}
        className="fixed top-0 z-50 h-20 w-full border-b border-white/30 bg-white/70 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-5 md:px-16">
          <Link href="/" className="group flex items-center gap-2">
            <motion.span
              whileHover={{ rotate: -12, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
              className="inline-flex"
            >
              <Droplet className="h-7 w-7 fill-[#1f8f87] text-[#1f8f87]" />
            </motion.span>
            <span className="font-[family-name:var(--font-display)] text-xl font-medium tracking-tight text-[#0c2b29]">
              Carry My Bottle
            </span>
          </Link>
          <nav className="hidden items-center gap-9 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                className="group relative text-sm font-medium text-[#3d4947] transition-colors hover:text-[#0f897f]"
                href={link.href}
              >
                {link.label}
                <span className="absolute -bottom-1.5 left-0 h-0.5 w-0 rounded-full bg-[#0f897f] transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Link
                href="/map"
                className="rounded-full bg-[#0c2b29] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0f897f]"
              >
                使ってみる
              </Link>
            </motion.div>
          </nav>
          <button
            type="button"
            aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="text-[#0c2b29] md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <X className="h-7 w-7" />
            ) : (
              <Menu className="h-7 w-7" />
            )}
          </button>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <motion.nav
            id="mobile-menu"
            initial={reduce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? undefined : { duration: 0.25, ease: EASE_OUT }}
            className="border-b border-white/20 bg-white/95 px-5 py-4 backdrop-blur-md md:hidden"
          >
            <ul className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    className="block font-medium text-[#3d4947] transition-colors hover:text-[#0f897f]"
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
                  className="block rounded-full bg-[#0c2b29] px-6 py-2.5 text-center font-bold text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  使ってみる
                </Link>
              </li>
            </ul>
          </motion.nav>
        )}
      </motion.header>

      <main className="pt-20">
        <Hero />
        <AboutSection />
        <FeaturesSection />
        <StorySection />
        <ImpactSection />
        <HowToSection />
        <FinalCta />
        <ContactSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#0c2b29]/8 bg-[#eceef0]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-5 py-12 md:flex-row md:px-16">
          <div className="flex flex-col items-center gap-3 md:items-start">
            <div className="flex items-center gap-2">
              <Droplet className="h-7 w-7 fill-[#00685f] text-[#00685f]" />
              <span className="font-[family-name:var(--font-display)] text-xl font-medium text-[#0c2b29]">
                キャリボト
              </span>
            </div>
            <p className="text-sm text-[#5a6b6a]">
              © 2024 Carry My Bottle. 大阪大学サステナビリティプロジェクト ／
              阪大マイボトル推進プロジェクト.
            </p>
            <a
              href="mailto:carry.my.bottle@gmail.com"
              className="text-sm font-medium text-[#00685f] transition-colors hover:text-[#004d46]"
            >
              carry.my.bottle@gmail.com
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a
              className="text-sm font-medium text-[#3d4947] transition-colors hover:text-[#00685f]"
              href="https://www.osaka-u.ac.jp/ja"
            >
              大阪大学公式サイト
            </a>
            <a
              className="text-sm font-medium text-[#3d4947] transition-colors hover:text-[#00685f]"
              href="#features"
            >
              機能
            </a>
            <a
              className="text-sm font-medium text-[#3d4947] transition-colors hover:text-[#00685f]"
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
