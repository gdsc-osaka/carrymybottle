import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  stats: { stationCount: number; targetCount: number; contactCount: number };
}

export function AdminDashboardPage({ stats }: Props) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">管理画面</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/stations">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">給水機</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.stationCount}</p>
              <p className="text-xs text-muted-foreground mt-1">給水機を管理する →</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/requests">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">設置希望</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.targetCount}</p>
              <p className="text-xs text-muted-foreground mt-1">コメントを確認する →</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/contacts">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">緊急連絡</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.contactCount}</p>
              <p className="text-xs text-muted-foreground mt-1">連絡内容を確認する →</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
