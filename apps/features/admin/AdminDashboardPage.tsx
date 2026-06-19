import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Droplets,
  Mail,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  stats: {
    stationCount: number;
    targetCount: number;
    contactCount: number;
    inquiryCount: number;
  };
}

interface StatCard {
  href: string;
  title: string;
  cta: string;
  value: number;
  icon: LucideIcon;
  /** アイコンバッジの配色。 */
  accent: string;
}

export function AdminDashboardPage({ stats }: Props) {
  const cards: StatCard[] = [
    {
      href: '/admin/stations',
      title: '給水機',
      cta: '給水機を管理する',
      value: stats.stationCount,
      icon: Droplets,
      accent: 'bg-teal-50 text-teal-600',
    },
    {
      href: '/admin/requests',
      title: '設置希望',
      cta: 'コメントを確認する',
      value: stats.targetCount,
      icon: MapPin,
      accent: 'bg-sky-50 text-sky-600',
    },
    {
      href: '/admin/contacts',
      title: '緊急連絡',
      cta: '連絡内容を確認する',
      value: stats.contactCount,
      icon: AlertTriangle,
      accent: 'bg-rose-50 text-rose-600',
    },
    {
      href: '/admin/inquiries',
      title: 'お問い合わせ',
      cta: 'お問い合わせを確認する',
      value: stats.inquiryCount,
      icon: Mail,
      accent: 'bg-violet-50 text-violet-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          ダッシュボード
        </h1>
        <p className="text-sm text-slate-500">
          各メニューの件数サマリーです。カードから詳細に移動できます。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ href, title, cta, value, icon: Icon, accent }) => (
          <Link key={href} href={href} className="group">
            <Card className="border-slate-200 transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    {title}
                  </span>
                  <span
                    className={cn(
                      'flex size-9 items-center justify-center rounded-full',
                      accent
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                </div>
                <p className="text-4xl font-bold text-slate-900">{value}</p>
                <p className="flex items-center gap-1 text-xs font-medium text-teal-600">
                  {cta}
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
