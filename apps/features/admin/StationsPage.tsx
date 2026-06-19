'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAsyncAction } from '@/hooks/use-async-action';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { StationForm } from './StationForm';
import { deleteStationAction, unpublishStationAction } from './actions';
import { STATUS_LABELS, TEMPERATURE_LABELS } from './validation';
import {
  STATUS_BADGE_CLASS,
  TEMPERATURE_BADGE_CLASS,
  VISIBILITY_BADGE_CLASS,
} from './badge-styles';
import type { Campus, Building, StationWithRelations } from '@/lib/db/types';

interface Props {
  stations: StationWithRelations[];
  campuses: Campus[];
  buildings: Building[];
  /** 画像の公開配信ベースURL（既存画像プレビュー用）。 */
  imageBaseUrl?: string;
}

export function StationsPage({
  stations,
  campuses,
  buildings,
  imageBaseUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const [editStation, setEditStation] = useState<
    StationWithRelations | undefined
  >();
  const { processingId, error, run } = useAsyncAction();

  function openCreate() {
    setEditStation(undefined);
    setOpen(true);
  }

  function openEdit(station: StationWithRelations) {
    setEditStation(station);
    setOpen(true);
  }

  async function handleUnpublish(id: string) {
    await run(
      id,
      () => unpublishStationAction(id),
      '非公開化に失敗しました。再試行してください。'
    );
  }

  async function handleDelete(id: string) {
    await run(
      id,
      () => deleteStationAction(id),
      '削除に失敗しました。再試行してください。'
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">給水機管理</h1>
          <p className="text-sm text-slate-500">
            登録済みの給水機 {stations.length} 件
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openCreate}
              className="bg-teal-600 text-white hover:bg-teal-700"
            >
              <Plus className="size-4" />
              給水機を追加
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto md:max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {editStation ? '給水機を編集' : '給水機を追加'}
              </DialogTitle>
            </DialogHeader>
            <StationForm
              campuses={campuses}
              buildings={buildings}
              station={editStation}
              imageBaseUrl={imageBaseUrl}
              onSuccess={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="font-semibold text-slate-700">
                給水機名
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                キャンパス
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                建物
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                状態
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                対応水温
              </TableHead>
              <TableHead className="font-semibold text-slate-700">
                公開状態
              </TableHead>
              <TableHead className="text-right font-semibold text-slate-700">
                操作
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-slate-400"
                >
                  給水機がありません
                </TableCell>
              </TableRow>
            )}
            {stations.map((station) => (
              <TableRow
                key={station.id}
                className={cn(
                  'hover:bg-teal-50/40',
                  !station.isPublic && 'bg-slate-50/60'
                )}
              >
                <TableCell className="font-medium text-slate-900">
                  {station.name}
                </TableCell>
                <TableCell className="text-slate-600">
                  {station.campus.name}
                </TableCell>
                <TableCell className="text-slate-600">
                  {station.building.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={STATUS_BADGE_CLASS[station.status]}
                  >
                    {STATUS_LABELS[station.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {station.temperatures.map((t) => (
                      <Badge
                        key={t.temperatureType}
                        variant="outline"
                        className={cn(
                          'text-xs',
                          TEMPERATURE_BADGE_CLASS[t.temperatureType]
                        )}
                      >
                        {TEMPERATURE_LABELS[t.temperatureType]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      station.isPublic
                        ? VISIBILITY_BADGE_CLASS.public
                        : VISIBILITY_BADGE_CLASS.private
                    }
                  >
                    {station.isPublic ? '公開中' : '非公開'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(station)}
                    >
                      編集
                    </Button>
                    {station.isPublic && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="secondary">
                            非公開化
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              非公開化しますか？
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              「{station.name}
                              」を非公開にします。QRコードが設置済みの場合はこちらを推奨します。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>キャンセル</AlertDialogCancel>
                            <AlertDialogAction
                              disabled={processingId === station.id}
                              onClick={() => handleUnpublish(station.id)}
                            >
                              {processingId === station.id
                                ? '処理中...'
                                : '非公開にする'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          削除
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>削除しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            「{station.name}
                            」を完全に削除します。この操作は取り消せません。
                            {station.shortLinkUrl &&
                              ' QRコードと紐づいているため、非公開化を検討してください。'}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={processingId === station.id}
                            onClick={() => handleDelete(station.id)}
                          >
                            {processingId === station.id
                              ? '削除中...'
                              : '削除する'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
