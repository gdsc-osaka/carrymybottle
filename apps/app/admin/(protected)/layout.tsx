import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Droplet, LogOut } from 'lucide-react';
import { verifySession } from '@/lib/auth/session';
import { logoutAction } from '@/features/admin/actions';
import { AdminNav } from '@/features/admin/AdminNav';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const valid = await verifySession();
  if (!valid) {
    redirect('/admin/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-2.5">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 font-semibold text-teal-700"
            >
              <Droplet className="size-5 fill-teal-600 text-teal-600" />
              <span className="hidden sm:inline">キャリボト管理</span>
            </Link>
            <AdminNav />
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-slate-900"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">ログアウト</span>
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
