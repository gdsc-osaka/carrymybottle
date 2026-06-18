import { requireAdminSession } from '@/lib/auth/session';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getDb } from '@/lib/db/client';
import { getQrAnalytics } from '@/features/admin/queries';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AnalyticsPage() {
  await requireAdminSession();
  const { env } = await getCloudflareContext({ async: true });
  const db = getDb(env.DB);
  
  const environment = env.APP_ENV || 'development';
  const analytics = await getQrAnalytics(db, environment);
  
  // Only show stations that have at least 1 scan or view
  const activeAnalytics = analytics.filter(a => a.scanCount > 0 || a.viewCount > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">分析</h1>
        <p className="text-muted-foreground mt-2">
          QRコードおよび短縮リンク経由のアクセス状況を確認できます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>給水機別アクセス状況</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>キャンパス</TableHead>
                <TableHead>建物</TableHead>
                <TableHead>給水機</TableHead>
                <TableHead className="text-right">QRスキャン数</TableHead>
                <TableHead className="text-right">詳細閲覧数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeAnalytics.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    データがありません
                  </TableCell>
                </TableRow>
              ) : (
                activeAnalytics.map((item) => (
                  <TableRow key={item.stationId}>
                    <TableCell>{item.campusName ?? '-'}</TableCell>
                    <TableCell>{item.buildingName ?? '-'}</TableCell>
                    <TableCell className="font-medium">{item.stationName}</TableCell>
                    <TableCell className="text-right">{item.scanCount}</TableCell>
                    <TableCell className="text-right">{item.viewCount}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
