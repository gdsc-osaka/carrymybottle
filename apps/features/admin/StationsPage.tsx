'use client';

import { useState } from 'react';
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
import { StationForm } from './StationForm';
import { deleteStationAction, unpublishStationAction } from './actions';
import { STATUS_LABELS, TEMPERATURE_LABELS } from './validation';
import type { Campus, Building, StationWithRelations } from '@/lib/db/types';

const STATUS_BADGE: Record<string, string> = {
  available: 'default',
  stopped: 'secondary',
  broken: 'destructive',
};

interface Props {
  stations: StationWithRelations[];
  campuses: Campus[];
  buildings: Building[];
}

export function StationsPage({ stations, campuses, buildings }: Props) {
  const [open, setOpen] = useState(false);
  const [editStation, setEditStation] = useState<
    StationWithRelations | undefined
  >();

  function openCreate() {
    setEditStation(undefined);
    setOpen(true);
  }

  function openEdit(station: StationWithRelations) {
    setEditStation(station);
    setOpen(true);
  }

  async function handleUnpublish(id: string) {
    await unpublishStationAction(id);
  }

  async function handleDelete(id: string) {
    await deleteStationAction(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">給水機管理</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>+ 給水機を追加</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editStation ? '給水機を編集' : '給水機を追加'}
              </DialogTitle>
            </DialogHeader>
            <StationForm
              campuses={campuses}
              buildings={buildings}
              station={editStation}
              onSuccess={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称</TableHead>
              <TableHead>キャンパス</TableHead>
              <TableHead>建物</TableHead>
              <TableHead>状態</TableHead>
              <TableHead>水温</TableHead>
              <TableHead>公開</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stations.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground py-8"
                >
                  給水機がありません
                </TableCell>
              </TableRow>
            )}
            {stations.map((station) => (
              <TableRow
                key={station.id}
                className={!station.isPublic ? 'opacity-50' : ''}
              >
                <TableCell className="font-medium">{station.name}</TableCell>
                <TableCell>{station.campus.name}</TableCell>
                <TableCell>{station.building.name}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      STATUS_BADGE[station.status] as
                        | 'default'
                        | 'secondary'
                        | 'destructive'
                    }
                  >
                    {STATUS_LABELS[station.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {station.temperatures.map((t) => (
                      <Badge
                        key={t.temperatureType}
                        variant="outline"
                        className="text-xs"
                      >
                        {TEMPERATURE_LABELS[t.temperatureType]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{station.isPublic ? '公開' : '非公開'}</TableCell>
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
                              onClick={() => handleUnpublish(station.id)}
                            >
                              非公開にする
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
                            onClick={() => handleDelete(station.id)}
                          >
                            削除する
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
