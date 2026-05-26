import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifySession } from '@/lib/auth/session';
import { logoutAction } from '@/features/admin/actions';
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
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="font-semibold">
              管理画面
            </Link>
            <Link
              href="/admin/stations"
              className="text-muted-foreground hover:text-foreground"
            >
              給水機
            </Link>
            <Link
              href="/admin/requests"
              className="text-muted-foreground hover:text-foreground"
            >
              設置希望
            </Link>
            <Link
              href="/admin/contacts"
              className="text-muted-foreground hover:text-foreground"
            >
              緊急連絡
            </Link>
          </nav>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              ログアウト
            </Button>
          </form>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
